use crate::download::{
    assemble_file, compare_directory_deep, download_with_client, get_directories, recover_file, save_filechunkmapping, trash_file, verify_cache
};
use crate::config::get_cache_setting;
use crate::file::sep;
use crate::sync::hash_dir;
use crate::types::{DownloadRequest, DownloadRequestMessage, DownloadServerOutput, FileChunk};
use crate::util::{
    delete_cache, delete_trash, get_cache_dir, get_trash_dir
};
use crate::dal::DataAccessLayer;
use futures::{stream, StreamExt};
use log::{info, warn};
use reqwest::Client;
use sqlx::{Pool, Row, Sqlite};
use std::fs::{self, remove_dir};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::Mutex;

const CONCURRENT_SERVER_REQUESTS: usize = 2;
const CONCURRENT_AWS_REQUESTS: usize = 4;

#[tauri::command]
pub async fn reset_files(
    pid: i32,
    filepaths: Vec<String>,
    user: String,
    app_handle: AppHandle,
) -> Result<bool, ()> {
    let state_mutex = app_handle.state::<Mutex<Pool<Sqlite>>>();
    let pool = state_mutex.lock().await;
    let dal = DataAccessLayer::new(&pool);
    let project_dir = dal.get_project_dir(pid)
        .await
        .unwrap();
    let server_url = dal.get_current_server().await.unwrap();
    let cache_dir = get_cache_dir(&pool).await.unwrap();
    let trash_dir = get_trash_dir(&pool).await.unwrap();

    // separate into download and delete lists
    let mut to_download: Vec<DownloadRequest> = Vec::new();
    let mut to_copy: Vec<DownloadRequestMessage> = Vec::new();
    let mut to_delete: Vec<DownloadRequestMessage> = Vec::new();
    for file in filepaths.clone() {
        let result = sqlx::query(
            "
            SELECT base_commitid, base_hash, curr_hash FROM file WHERE
            pid = $1 AND filepath = $2 LIMIT 1;
            ",
        )
        .bind(pid)
        .bind(file.clone())
        .fetch_one(&*pool)
        .await;

        match result {
            Ok(row) => {
                let commit: i64 = row.get::<i64, &str>("base_commitid");
                let base_hash: String = row.get::<String, &str>("base_hash");
                let curr_hash: String = row.get::<String, &str>("curr_hash");
                if commit >= 0 {
                    let cache_path = cache_dir.clone() + &(sep().to_string()) + base_hash.as_str();
                    to_copy.push(DownloadRequestMessage {
                        hash: base_hash,
                        rel_path: file.clone(),
                        commit_id: commit,
                        download: true,
                    });

                    // if file isnt in cache, we need to  download it
                    if !verify_cache(&cache_path).unwrap() {
                        to_download.push(DownloadRequest {
                            project_id: pid.into(),
                            path: file,
                            commit_id: commit,
                            user_id: user.clone(),
                        });
                    }
                } else {
                    to_delete.push(DownloadRequestMessage {
                        commit_id: -1,
                        download: false,
                        rel_path: file,
                        hash: curr_hash,
                    });
                }
            }
            Err(err) => {
                println!("reset files error: {}", err);
                return Ok(false);
            }
        }
    }

    // request S3 presigned urls
    let endpoint = server_url + "/store/download";
    let glassy_client: Client = reqwest::Client::new();
    let outputs = stream::iter(to_download.clone())
        .map(|download| {
            let cloned_endpoint = endpoint.clone();
            let auth = user.clone();
            let g_client = &glassy_client;
            async move {
                // send a request for the chunk urls, await
                let body: DownloadRequest = DownloadRequest {
                    project_id: pid.to_owned().into(),
                    path: download.path,
                    commit_id: download.commit_id,
                    user_id: auth,
                };
                let response = g_client.post(cloned_endpoint).json(&body).send().await;

                match response {
                    Ok(res) => res
                        .json::<DownloadServerOutput>()
                        .await
                        .unwrap_or_else(|_| DownloadServerOutput {
                            response: "server error".to_string(),
                            body: None,
                        }),
                    Err(err) => {
                        println!("error: {}", err);
                        DownloadServerOutput {
                            response: "reqwest error".to_string(),
                            body: None,
                        }
                    }
                }
            }
        })
        .buffer_unordered(CONCURRENT_SERVER_REQUESTS);

    let chunk_downloads = Arc::new(Mutex::new(Vec::<FileChunk>::new()));
    let moved_chunk_downloads = Arc::clone(&chunk_downloads);
    let error_flag = Arc::new(Mutex::new(false));
    let moved_error_flag = Arc::clone(&error_flag);
    outputs
        .for_each(|output| {
            let cloned_boi = Arc::clone(&moved_chunk_downloads);
            let cloned_error_flag = Arc::clone(&moved_error_flag);
            let cache = cache_dir.clone();
            async move {
                let mut error = cloned_error_flag.lock().await;
                if output.response == "success" {
                    let info = output.body.unwrap();
                    let _ = save_filechunkmapping(&cache, &info).unwrap();
                    for chunk in info.file_chunks {
                        cloned_boi.lock().await.push(chunk);
                    }
                } else {
                    *error = false;
                    println!(
                        "error TODO something L159 download.rs: response= {}",
                        output.response
                    );
                }
            }
        })
        .await;

    if *error_flag.lock().await {
        println!("issue getting download link");
        return Ok(false);
    }

    let num_chunks = chunk_downloads.lock().await.len();
    println!("s3 urls obtained, downloading {} chunks...", num_chunks);

    // download chunks
    let copy = (*chunk_downloads).lock().await.clone();
    let aws_client: Client = reqwest::Client::new();
    let _ = stream::iter(copy.into_iter())
        .for_each_concurrent(CONCURRENT_AWS_REQUESTS, |chunk_info| {
            let cloned_error_flag = Arc::clone(&moved_error_flag);
            let handle = &app_handle;
            let client = &aws_client;
            // create cache_dir/file_hash directory
            let filehash_dir = cache_dir.clone() + &(sep().to_string()) + chunk_info.file_hash.as_str();
            async move {
                let res = download_with_client(&filehash_dir, chunk_info, client).await;
                let mut error = cloned_error_flag.lock().await;
                let _ = match res {
                    Ok(_) => {
                        let _ = handle.emit("downloadedFile", &num_chunks);
                    }
                    Err(err) => {
                        *error = true;
                        println!("error downloading file {}", err);
                    }
                };
            }
        })
        .await;

    if *error_flag.lock().await {
        println!("issue downloading file from s3");
        return Ok(false);
    }

    // verify the chunks exist
    for file in to_copy.clone() {
        let cache_str = cache_dir.clone() + &(sep().to_string()) + file.hash.as_str();
        let res = verify_cache(&cache_str).unwrap();
        if !res {
            println!("verifying cache failed: {}", file.hash);
            return Ok(false);
        }
    }

    // delete files
    let _ = app_handle.emit("cacheComplete", 4);

    let mut deleted = Vec::<DownloadRequestMessage>::new();
    let mut error_flag = false;
    for file in to_delete.clone() {
        let proj_path = project_dir.clone() + &(sep().to_string()) + file.rel_path.as_str();
        if !trash_file(&proj_path, &trash_dir, file.clone().hash).unwrap() {
            error_flag = true;
            break;
        } else {
            deleted.push(file);
        }
    }

    // if we failed to delete a file, undo delete and return early
    if error_flag {
        for file in deleted {
            let proj_dir = project_dir.clone() + &(sep().to_string()) + file.rel_path.as_str();
            let _ = recover_file(&trash_dir, &proj_dir).unwrap();
        }
        return Ok(false);
    } else {
        let mut directories = Vec::from_iter(get_directories(&to_delete));
        directories.sort_by(|a, b| compare_directory_deep(a, b) );
        info!("deleting directories");
        
        for folder in directories {
            info!("{}", folder);
            let proj_dir = project_dir.clone() + &folder;
            let path = PathBuf::from(proj_dir);
            // if file's folder is empty, delete it (ie use remove_dir() which will delete only if it is empty)
            match remove_dir(path) {
                Ok(()) => info!("successful delete"),
                Err(_e) => warn!("no delete")
            };
        }
        
        let _ = delete_trash(&pool).await.unwrap();
    }

    // copy over files in cache to project
    let mut oops = 0;
    for file in to_copy {
        // find the hash in the cache and copy to rel path
        let cache_str = cache_dir.clone() + &(sep().to_string()) + file.hash.as_str();
        let proj_str = project_dir.clone() + &(sep().to_string()) + file.rel_path.as_str();
        match Path::new(&cache_str).try_exists() {
            Ok(res) => {
                if res {
                    let prefix = Path::new(&proj_str).parent().unwrap();
                    match fs::create_dir_all(prefix) {
                        Ok(_) => {},
                        Err(err) => {
                            log::error!("reset: couldn't create directory {}: {}", prefix.display(), err);
                        }
                    };
                    // assemble file from chunk(s)
                    let res = assemble_file(&cache_str, &proj_str).unwrap();
                    let _ = app_handle.clone().emit("fileAction", 4);
                    if !res {
                        log::error!("error assembling file")
                        // failure
                        // how do we want to handle this? because we've already started copying files into project
                        // TODO
                    }
                } else {
                    println!("file {} not found in cache", cache_str);
                    oops += 1;
                    continue;
                }
            }
            Err(err) => {
                println!("error copying file: {}", err);
                oops += 1;
                continue;
            }
        }
    }
    println!("download files: {} files not found in cache", oops);

    // sync project directory
    hash_dir(pid as i32, project_dir.into(), &pool).await;

    // if configured, delete cache
    let should_delete_cache = get_cache_setting(&pool).await.unwrap();
    if should_delete_cache {
        let _ = delete_cache(&pool).await;
    }

    Ok(true)
}
