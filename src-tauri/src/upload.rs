use serde::{Deserialize, Serialize};
use std::fs;
use tauri::State;
use futures::{stream, StreamExt};
use tokio::sync::Mutex;
use std::path::Path;
use sqlx::{Pool, Sqlite, Row};
use tauri::{AppHandle, Manager};
use crate::download::{delete_file, download_with_client};
use crate::types::{ChangeType, DownloadInformation, DownloadRequest, UpdatedFile};
use crate::util::{get_basehash, get_cache_dir, get_current_server, get_file_as_byte_vec, get_file_info, get_project_dir};
use reqwest::{Client, Response};
use reqwest::multipart::*;

const CONCURRENT_REQUESTS: usize = 4;

#[tauri::command]
pub async fn upload_files(pid: i32, filepaths: Vec<String>, token: String, app_handle: AppHandle) -> Result<bool, ()> {
    let state_mutex = app_handle.state::<Mutex<Pool<Sqlite>>>();
    let pool = state_mutex.lock().await;
    let project_dir = get_project_dir(pid, &pool).await.unwrap();
    let server_url = get_current_server(&pool).await.unwrap();
    let endpoint = server_url + "/store/request";
    let client: Client = reqwest::Client::new();

    let mut uploaded: u32 = 0;
    for filepath in filepaths {
        // TODO change \\ to the thing so it is OS agnostic
        let abspath = project_dir.clone() + "\\" + &filepath;
        println!("project_dir: {}", project_dir.clone());
        println!("abs path: {}", abspath);

        // if change type is delete we can skip
        let file: UpdatedFile = get_file_info(pid, filepath.clone(), &pool).await.unwrap();
        if file.change == ChangeType::Delete || file.size == 0 {

            uploaded += 1;
            let _ = app_handle.emit("fileAction", uploaded);  
            continue;
        }

        println!("file: {}\t hash: {}", filepath, file.hash);
        let content: Vec<u8> = get_file_as_byte_vec(&abspath);
        let form: Form = reqwest::multipart::Form::new()
            .text("hash", file.hash)
            .part("file", Part::bytes(content).file_name(filepath)); // .file_name(filepath) ncessary?

        let res: Response = client.post(&endpoint)
            .multipart(form)
            .bearer_auth(&token)
            .send()
            .await.unwrap();

        println!("{}", res.text().await.unwrap());

        // TODO check response

        // emit status
        uploaded += 1;
        let _ = app_handle.emit("fileAction", uploaded);        
    }

  Ok(true)
}

#[derive(Serialize, Deserialize)]
pub struct UploadedFile {
    pub path: String,
    pub hash: String,
    pub changetype: i32
}

#[tauri::command]
pub async fn update_uploaded(pid: i32, commit: i32, files: Vec<UploadedFile>, state_mutex: State<'_, Mutex<Pool<Sqlite>>>) -> Result<bool, ()> {
    let pool = state_mutex.lock().await;

    println!("updating db...");
    for file in files {
        if file.changetype == 3 { // delete
            let owo = sqlx::query(
                "DELETE FROM file
                WHERE pid = $1 AND filepath = $2"
                )
                .bind(pid)
                .bind(file.path)
                .execute(&*pool).await;
            match owo {
                Ok(_) => {
                },
                Err(err) => {
                    println!("db err: {}", err);
                }
            }
        }
        else if file.changetype == 1 || file.changetype == 2 {
            let uwu = sqlx::query(
                "UPDATE file SET
                change_type = 0,
                base_hash = curr_hash,
                tracked_hash = curr_hash,
                base_commitid = $1,
                tracked_commitid = $1
                WHERE pid = $2 AND filepath = $3"
                )
                .bind(commit)
                .bind(pid)
                .bind(file.path)
                .execute(&*pool).await;
            
            match uwu {
                Ok(_) => {
                },
                Err(err) => {
                    println!("db err: {}", err);
                }
            }
        }
    }

    Ok(true)
}


#[tauri::command]
pub async fn reset_files(pid: i64, filepaths: Vec<String>, token: String, app_handle: AppHandle) -> Result<bool, ()> {
    let state_mutex = app_handle.state::<Mutex<Pool<Sqlite>>>();
    let pool = state_mutex.lock().await;
    let project_dir = get_project_dir(pid.try_into().unwrap(), &pool).await.unwrap();
    let server_url = get_current_server(&pool).await.unwrap();
    let endpoint = server_url + "/store/download";
    let glassy_client: Client = reqwest::Client::new();
    let aws_client: Client = reqwest::Client::new();
    let cache_dir = get_cache_dir(&pool).await.unwrap();

    // separate into download and delete lists
    let mut to_download: Vec<DownloadRequest> = Vec::new();
    let mut to_delete: Vec<String> = Vec::new();
    for file in filepaths.clone() {
        let result = sqlx::query(
            "
            SELECT base_commitid FROM file WHERE
            pid = $1 AND filepath = $2 LIMIT 1;
            "
        )
        .bind(pid)
        .bind(file.clone())
        .fetch_one(&*pool).await;

        match result {
            Ok(row) => {
                let commit: i64 = row.get::<i64, &str>("base_commitid");
                if commit >= 0 {
                    // TODO if we have the hash in the cache
                    // we should not download it
                    to_download.push(DownloadRequest {
                        project_id: pid,
                        path: file,
                        commit_id: commit
                    })
                }
                else {
                    to_delete.push(file)
                }
            },
            Err(err) => {
                println!("reset files error: {}", err);
            }
        }
    }

    // download files to cache
    // request S3 presigned urls
    let bodies = stream::iter(to_download.clone())
    .map(|file: DownloadRequest| {
        let g_client = &glassy_client;
        let auth = token.clone();
        let cpy_endpoint = endpoint.clone();
        //let project_id = &project_id_cpy;
        async move {
            let response = g_client
                .post(cpy_endpoint)
                .json(&file)
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
        let handle = &app_handle;
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
        let _ = handle.emit("fileAction", payload);
    }).await;

    // delete files
    for file in to_delete.clone() {
        println!("deleting {}", file);
        let _ = delete_file(pid.try_into().unwrap(), file, &pool).await.unwrap();

        let payload = 4;
        let _ = app_handle.emit("fileAction", payload);
    }

    // transfer files from cache to project place and update database
    let mut oops = 0;
    for file in to_download {
        // find the hash in the cache and copy to rel path
        let hash = get_basehash(pid.try_into().unwrap(), file.path.clone(), &pool).await;
        let cache_str;
        match hash {
            Ok(hash) => cache_str = cache_dir.clone() + "\\" +  &hash,
            Err(_) => continue
        }
        let proj_str = project_dir.clone() + "\\" + file.path.as_str();
        match Path::new(&cache_str).try_exists() {
            Ok(res) => {
                if res {
                    let prefix = Path::new(&proj_str).parent().unwrap();
                    fs::create_dir_all(prefix).unwrap();
                    let _ = fs::copy(cache_str, proj_str.clone());
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
        let metadata = std::fs::metadata(proj_str).unwrap();
        let filesize = metadata.len();
        let res = sqlx::query("UPDATE file SET
            curr_hash = base_hash,
            change_type = 0,
            in_fs = 1,
            size = $3
            WHERE pid = $1 AND filepath = $2"
        )
            .bind(pid)
            .bind(file.path)
            .bind(filesize as i64)
            .execute(&*pool).await;

        match res {
            Ok(a) => println!("update ok"),
            Err(err) => println!("error: {}", err)
        }
    }
    println!("download files: {} files not found in cache", oops);

    // update database
    for file in to_delete {
        let _ = sqlx::query("DELETE FROM file WHERE
            pid = $1 AND filepath = $2"
        )
            .bind(pid)
            .bind(file)
            .execute(&*pool).await;
    }

    // TODO check output of the queries where we update the database
  Ok(true)
}