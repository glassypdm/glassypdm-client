use std::fs::{self, File};
use std::io::{self, BufReader, BufWriter, Write};
use std::path::Path;
use futures::{stream, StreamExt};
use reqwest::Client;
use sqlx::{Pool, Sqlite, Row};
use tauri::utils::acl;
use tauri::{AppHandle, Manager, State};
use crate::types::{DownloadInformation, DownloadRequest, DownloadRequestMessage, DownloadServerOutput, FileChunk, ReqwestError};
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

#[tokio::main]
#[tauri::command]
pub async fn download_files(pid: i32, files: Vec<DownloadRequestMessage>, token: String, state_mutex: State<'_, Mutex<Pool<Sqlite>>>, app_handle: AppHandle) -> Result<bool, ReqwestError> {
    let pool = state_mutex.lock().await;
    let server_url = get_current_server(&pool).await.unwrap();
    let project_dir = get_project_dir(pid, &pool).await.unwrap();
    let cache_dir = get_cache_dir(&pool).await.unwrap();

    if project_dir == "" || cache_dir == "" || server_url == "" {
        println!("download files: project or cache dir is invalid");
        return Ok(false);
    }

    // sort files into delete and download piles
    let mut to_download: Vec<DownloadRequestMessage> = Vec::new();
    let mut to_delete: Vec<DownloadRequestMessage> = Vec::new();
    for file in files.clone() {
        if file.download {
            let cached_path = cache_dir.clone() + "\\" + &file.hash;

            if Path::new(&cached_path).exists() {
                println!("hash exists in cache");
                let payload = 4;
                let _ = app_handle.emit("downloadedFile", payload);
            }
            else {
                to_download.push(file.clone());
            }
        }
        else {
            to_delete.push(file)
        }
    }

    // request S3 presigned urls
    let endpoint = server_url + "/store/download";

    let rt = tokio::runtime::Handle::current();
    let mut handles = vec![];
    for download in to_download.clone() {
        // copy needed things like endpoint, client, token, etc
        let cloned_cache_dir = cache_dir.clone();
        let cloned_endpoint = endpoint.clone();
        let cloned_token = token.clone();
        let tauri_handle = app_handle.clone();
        let handle = rt.spawn(async move {
            let glassy_client: Client = reqwest::Client::new();
            let aws_client: Client = reqwest::Client::new();

            // send a request for the chunk urls, await
            let body: DownloadRequest = DownloadRequest {
                project_id: pid.to_owned().into(),
                path: download.rel_path,
                commit_id: download.commit_id
            };
            let response = glassy_client
                .post(cloned_endpoint.to_owned())
                .json(&body)
                .bearer_auth(cloned_token.to_owned())
                .send().await;

            let data = match response {
                Ok(res) => {
                    res.json::<DownloadServerOutput>().await.unwrap_or_else(
                        |_| DownloadServerOutput { response: "fail".to_string(), body: None })
                },
                Err(err) => {
                    println!("error: {}", err);
                    DownloadServerOutput { response: "fail".to_string(), body: None }
                }
            };

            // for each chunk url, download them concurrently to cache
            // in cache, make a file hash folder
            // save block hashes to the folder
            // save a json file in the hash folder with the indices
            if data.response == "success" {
                let download_info = data.body.unwrap();

                // save json file in the file hash folder with indices
                let _ = save_filechunkmapping(&cloned_cache_dir, &download_info);
                let hash_dir = cloned_cache_dir.to_owned() + "\\" + download_info.file_hash.as_str();

                // download chunks
                let _ = stream::iter(download_info.file_chunks)
                    .for_each_concurrent(CONCURRENT_REQUESTS, |chunk| {
                        let hash_folder = hash_dir.clone();
                        let a_client = aws_client.clone();
                        async move {
                            let ret = download_with_client(&hash_folder, chunk, &a_client).await;
                            match ret {
                                Ok(out) => {
                                    if out != true {
                                        println!("oof")
                                    }
                                },
                                Err(err) => {
                                    println!("error downloading chunk: {}", err)
                                }
                            }
                        }
                    }).await;
            }

            // emit to app handle
            // FIXME not firing
            let _ = tauri_handle.emit("downloadedFile", 6030);
        });

        handles.push(handle);
    }

    // wait for futures to run to completion
    futures::future::join_all(handles).await;
    println!("handles shouldve finished downloading to cache");
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
                    // assemble file from chunk(s)
                    let _ = assemble_file(&cache_str, &proj_str);
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

// TODO error handle if client couldnt get
pub async fn download_with_client(dir: &String, chunk_download: FileChunk, client: &Client) -> Result<bool, ReqwestError> {
    let resp = client
        .get(chunk_download.s3_url)
        .send()
        .await?
        .bytes()
        .await?;

    // temp path: cache + hash(.glassy?)
    let path = dir.to_owned() + "\\" + &chunk_download.block_hash;
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

// TODO refactor unwrap, lmao
fn save_filechunkmapping(cache_dir: &String, download: &DownloadInformation) -> Result<bool, ()> {
    // TODO linux support, create path the proper way
    let abs_path = cache_dir.to_owned() + "\\" + &download.file_hash + "\\mapping.json";
    let path: &Path = std::path::Path::new(&abs_path);
    let prefix = path.parent().unwrap();
    fs::create_dir_all(prefix).unwrap();

    let file = File::create(path).unwrap();
    let mut writer = BufWriter::new(file);
    serde_json::to_writer(&mut writer, &download.file_chunks).unwrap();
    writer.flush().unwrap();

    Ok(true)
}

// cache dir should be the folder for the file in the cache dir
// proj dir should be the complete path to the desired file
// TODO refactor unwrap
fn assemble_file(cache_dir: &String, proj_path: &String) -> Result<bool, ()> {
    // read in mapping.json
    let mapping_path = cache_dir.to_owned() + "\\mapping.json";
    let file = File::open(mapping_path).unwrap();
    let reader = BufReader::new(file);
    let mapping: Vec<FileChunk> = serde_json::from_reader(reader).unwrap();

    if mapping.len() == 1 {
        // nothing to do, just copy the file
        let cache_path = cache_dir.to_owned() + "\\" + &mapping[0].block_hash;
        fs::copy(cache_path, proj_path);
        return Ok(true);
    }
    else if mapping.len() == 0 {
        return Ok(false);
    }


    Ok(true)
}