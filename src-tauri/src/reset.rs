use std::fs;
use futures::{stream, StreamExt};
use tokio::sync::Mutex;
use std::path::Path;
use sqlx::{Pool, Sqlite, Row};
use tauri::{AppHandle, Manager, Emitter};
use crate::download::{delete_file, download_with_client};
use crate::types::{DownloadServerOutput, DownloadRequest};
use crate::util::{get_basehash, get_cache_dir, get_current_server, get_project_dir};
use reqwest::Client;

const CONCURRENT_DOWNLOAD_REQUESTS: usize = 4;


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

    /*
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
            response.json::<DownloadServerOutput>()
                .await
        }
    })
    .buffer_unordered(CONCURRENT_DOWNLOAD_REQUESTS);

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
    */
  Ok(true)
}