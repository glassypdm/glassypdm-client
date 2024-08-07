use std::fs::{self, File};
use std::io;
use std::path::Path;
use futures::{stream, StreamExt};
use reqwest::Client;
use sqlx::{Pool, Sqlite, Row};
use tauri::State;
use crate::types::{DownloadInformation, DownloadRequest, ReqwestError};
use crate::util::get_cache_dir;
use crate::{types::RemoteFile, util::{get_current_server, get_project_dir}};
use std::path::PathBuf;
use tokio::sync::Mutex;

const CONCURRENT_REQUESTS: usize = 4;

#[tauri::command]
pub async fn delete_file_cmd(pid: i32, rel_path: String, state_mutex: State<'_, Mutex<Pool<Sqlite>>>) -> Result<bool, ()> {
    let pool = state_mutex.lock().await;
    let output = delete_file(pid, rel_path, &pool).await.unwrap();
    Ok(output)
}

async fn delete_file(pid: i32, rel_path: String, pool: &Pool<Sqlite>) -> Result<bool, ()> {
    let project_dir = get_project_dir(pid, &pool).await.unwrap();
    if project_dir == "" {
        return Ok(false);
    }
    let path = project_dir + &rel_path;
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
pub async fn download_files(pid: i32, files: Vec<DownloadRequest>, token: String, state_mutex: State<'_, Mutex<Pool<Sqlite>>>) -> Result<bool, ReqwestError> {
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
    let mut to_download: Vec<&DownloadRequest> = Vec::new();
    let mut to_download_req: Vec<&DownloadRequest> = Vec::new();
    let mut to_delete: Vec<&DownloadRequest> = Vec::new();
    for file in &files {
        if file.download {
            to_download.push(file);
            to_download_req.push(file);
        }
        else {
            to_delete.push(file)
        }
    }
    // FIXME fix this
    // maybe try out rayon?
    /*
    // request S3 presigned urls
    let bodies = stream::iter(to_download_req)
    .map(|file: &DownloadRequest| {
        let g_client = &glassy_client;
        let auth = &token;
        //let project_id = &project_id_cpy;
        async move {
            let response = g_client
                .post("url") // TODO add body
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
                let _ = download_with_client(&cache_dir, b, &aws_client).await;
            }
            Err(e) => {
                println!("error! {}", e);
            },
        }

        // TODO emit download status event
    }).await;
*/

    // delete files
    for file in to_delete {
        if !delete_file(pid, file.rel_path.clone(), &pool).await.unwrap() {
            // TODO handle error
        }
    }
    // TODO once all the files are downloaded, copy them over to their proper paths
    for file in to_download {
        // find the hash in the cache and copy to rel path
    }

    // TODO update database (iterate over files parameter)
    for file in files {
        
    }
    Ok(true)
}

async fn download_with_client(cache_dir: &String, download: DownloadInformation, client: &Client) -> Result<bool, ReqwestError> {
    let resp = client
        .get(download.url.clone())
        .send()
        .await?
        .bytes()
        .await?;

    // temp path: cache + hash(.glassy?)
    let path = cache_dir.to_owned() + "\\" + &download.hash;

    // create cache folder if it doesnt exist
    let p: &Path = std::path::Path::new(&path);
    let prefix = p.parent().unwrap();
    fs::create_dir_all(prefix).unwrap();

    // save to cache
    let mut f = File::create(&path).expect("Unable to create file");
    io::copy(&mut &resp[..], &mut f).expect("Unable to copy data");

    Ok(true)
}