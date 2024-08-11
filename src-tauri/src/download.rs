use std::fs::{self, File};
use std::io;
use std::path::Path;
use futures::{stream, StreamExt};
use reqwest::Client;
use sqlx::{Pool, Sqlite, Row};
use tauri::{AppHandle, Manager, State};
use crate::types::{DownloadInformation, DownloadRequest, DownloadRequestMessage, ReqwestError};
use crate::util::get_cache_dir;
use crate::util::{get_current_server, get_project_dir};
use std::path::PathBuf;
use tauri::Emitter;
use tokio::sync::Mutex;

const CONCURRENT_REQUESTS: usize = 4;

#[tauri::command]
pub async fn delete_file_cmd(pid: i32, rel_path: String, state_mutex: State<'_, Mutex<Pool<Sqlite>>>) -> Result<bool, ()> {
    let pool = state_mutex.lock().await;
    let output = delete_file(pid, rel_path.clone(), &pool).await.unwrap();

    if output {
        let _ = sqlx::query(
            "
            DELETE FROM file
            WHERE pid = $1 AND filepath = $2
            "
        )
        .bind(pid)
        .bind(rel_path)
        .execute(&*pool);
    }

    Ok(output)
}

pub async fn delete_file(pid: i32, rel_path: String, pool: &Pool<Sqlite>) -> Result<bool, ()> {
    let project_dir = get_project_dir(pid, &pool).await.unwrap();
    if project_dir == "" {
        return Ok(false);
    }
    let path = project_dir + "\\" + &rel_path;
    println!("{}", path);
    let _ = fs::remove_file(path);
    Ok(true)
}

// download a single file
#[tauri::command]
pub async fn download_s3_file(pid: i32, s3_url: String, rel_path: String, state_mutex: State<'_, Mutex<Pool<Sqlite>>>) -> Result<bool, ()> {
    let pool = state_mutex.lock().await;
    let mut resp = reqwest::blocking::get(s3_url).unwrap();

    // generate absolute path
    let project_dir = get_project_dir(pid, &pool).await.unwrap();
    let path_str = project_dir + &rel_path;
    let path: &Path = std::path::Path::new(&path_str);

    // create necessary folders for path
    let prefix = path.parent().unwrap();
    fs::create_dir_all(prefix).unwrap();

    // create file
    let mut f = match File::create(&path) {
        Ok(file) => file,
        Err(err) => {
            println!("Encountered error: {err}");
            return Ok(false);
            //panic!("unable to create file object for writing");
        }
    };
    io::copy(&mut resp, &mut f).expect("Unable to download data");

    // TODO write to database

    Ok(true)
}

#[tauri::command]
pub async fn download_files(pid: i32, files: Vec<DownloadRequestMessage>, token: String, state_mutex: State<'_, Mutex<Pool<Sqlite>>>, app_handle: AppHandle) -> Result<bool, ReqwestError> {
    let pool = state_mutex.lock().await;
    let glassy_client: Client = reqwest::Client::new();
    let aws_client: Client = reqwest::Client::new();
    let server_url = get_current_server(&pool).await.unwrap();
    let project_dir = get_project_dir(pid, &pool).await.unwrap();
    let cache_dir = get_cache_dir(&pool).await.unwrap();

    if project_dir == "" || cache_dir == "" || server_url == "" {
        println!("download files: project or cache dir is invalid");
        return Ok(false);
    }
    let mut to_download: Vec<DownloadRequestMessage> = Vec::new();
    let mut to_delete: Vec<DownloadRequestMessage> = Vec::new();
    for file in files.clone() {
        if file.download {
            to_download.push(file.clone());
        }
        else {
            to_delete.push(file)
        }
    }
    // request S3 presigned urls
    let endpoint = server_url + "/store/download";
    let bodies = stream::iter(to_download.clone())
    .map(|file: DownloadRequestMessage| {
        let g_client = &glassy_client;
        let auth = token.clone();
        let cpy_endpoint = endpoint.clone();
        let body: DownloadRequest = DownloadRequest {
            project_id: pid.into(),
            path: file.rel_path,
            commit_id: file.commit_id
        };
        //let project_id = &project_id_cpy;
        async move {
            let response = g_client
                .post(cpy_endpoint)
                .json(&body)
                .bearer_auth(auth)
                .send()
                .await.unwrap();
            response.json::<DownloadInformation>()
                .await
        }
    })
    .buffer_unordered(CONCURRENT_REQUESTS);

    // download files, save them in a cache (serverdir/.glassycache)
    bodies
    .for_each(|b| async {
        match b {
            Ok(b) => {
                println!("{}", b.status);
                let _ = download_with_client(&cache_dir, b, &aws_client).await;
            }
            Err(e) => {
                println!("error! {}", e);
            },
        }

        // emit download status event
        let payload = 4;
        let _ = app_handle.emit("downloadedFile", payload);
    }).await;

    // delete files
    for file in to_delete {
        if !delete_file(pid, file.rel_path.clone(), &pool).await.unwrap() {
            // TODO handle error
        }
        let payload = 4;
        let _ = app_handle.emit("downloadedFile", payload);
    }
    let mut oops = 0;
    for file in to_download {
        // find the hash in the cache and copy to rel path
        let cache_str = cache_dir.clone() + "\\" + file.hash.as_str();
        let proj_str = project_dir.clone() + "\\" + file.rel_path.as_str();
        match Path::new(&cache_str).try_exists() {
            Ok(res) => {
                if res {
                    let prefix = Path::new(&proj_str).parent().unwrap();
                    fs::create_dir_all(prefix).unwrap();
                    let _ = fs::copy(cache_str, proj_str);
                }
                else {
                    println!("file {} not found in cache", cache_str);
                    oops += 1;
                    continue;
                    // TODO we should emit something
                }
            },
            Err(err) => {
                println!("error copying file: {}", err);
                oops += 1;
                // TODO we should emit something
                continue;
            }
        }
    }
    println!("download files: {} files not found in cache", oops);

    // update database (iterate over files parameter)
    for file in files {
        if file.download {
            // TODO instead of using the tracked values
            // should we compute them instead?
            let _ = sqlx::query(
                "
                UPDATE file SET
                base_hash = tracked_hash,
                curr_hash = tracked_hash,
                base_commitid = tracked_commitid,
                size = tracked_size,
                in_fs = 1,
                change_type = 0
                WHERE pid = $1 AND filepath = $2
                "
            )
            .bind(pid.clone())
            .bind(file.rel_path)
            .execute(&*pool).await;
        }
        else { // file.download == delete
            let _ = sqlx::query(
                "DELETE FROM file
                WHERE pid = $1 AND filepath = $2"
            )
            .bind(pid.clone())
            .bind(file.rel_path)
            .execute(&*pool).await;
        }
    }
    Ok(true)
}

pub async fn download_with_client(cache_dir: &String, download: DownloadInformation, client: &Client) -> Result<bool, ReqwestError> {
    // TODO validate the options, look at status

    let resp = client
        .get(download.url.unwrap().clone())
        .send()
        .await?
        .bytes()
        .await?;

    // temp path: cache + hash(.glassy?)
    let path = cache_dir.to_owned() + "\\" + &download.hash.unwrap();
    println!("downloading to {}", path);

    // create cache folder if it doesnt exist
    let p: &Path = std::path::Path::new(&path);
    let prefix = p.parent().unwrap();
    fs::create_dir_all(prefix).unwrap();

    // save to cache
    let mut f = File::create(&path).expect("Unable to create file");
    io::copy(&mut &resp[..], &mut f).expect("Unable to copy data");

    Ok(true)
}