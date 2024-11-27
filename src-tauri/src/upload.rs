use std::sync::Arc;

use crate::types::{ChangeType, ReqwestError, UpdatedFile};
use crate::util::{get_current_server, get_file_info, get_project_dir, verify_file};
use fs_chunker::Chunk;
use futures::{stream, StreamExt};
use log::error;
use reqwest::multipart::*;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use sqlx::{Pool, Sqlite};
use tauri::State;
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::Mutex;

const CONCURRENT_UPLOAD_REQUESTS: usize = 2;

#[derive(Serialize, Deserialize)]
pub struct UploadResponse {
    pub response: String,
    pub body: Option<ServerDefaultSuccessBody>,
    pub error: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct ServerDefaultSuccessBody {
    pub message: String,
}

#[derive(Serialize, Deserialize)]
pub enum UploadChunkError {
    ErrOk = 0,
    ErrGeneric,
    ErrInvalidFile,
}

#[derive(Serialize, Deserialize)]
pub struct UploadChunkResponse {
    pub success: bool,
    pub error: UploadChunkError,
    pub message: Option<String>
}

#[tauri::command]
pub async fn upload_files(
    pid: i32,
    filepaths: Vec<String>,
    user: String,
    app_handle: AppHandle,
) -> Result<UploadChunkResponse, ReqwestError> {
    let state_mutex = app_handle.state::<Mutex<Pool<Sqlite>>>();
    let pool = state_mutex.lock().await;
    let project_dir = get_project_dir(pid, &pool).await.unwrap();
    let server_url = get_current_server(&pool).await.unwrap();
    let endpoint = server_url + "/store/request";
    let client: Client = reqwest::Client::new();
    log::debug!("uploading files for project {}", pid);

    let mut to_upload: Vec<UpdatedFile> = vec![];
    let mut uploaded: u32 = 0;
    for filepath in filepaths {
        let file: UpdatedFile = get_file_info(pid, filepath.clone(), &pool).await.unwrap();

        // verify file information
        if !verify_file(&filepath, pid, &pool).await.unwrap() {
            return Ok(UploadChunkResponse {
                success: false,
                error: UploadChunkError::ErrInvalidFile,
                message: Some(filepath)
            });
        }

        // figure out which files actually need to be uploaded
        if file.change == ChangeType::Delete || file.size == 0 {
            uploaded += 1;
            let _ = app_handle.emit("fileAction", uploaded);
            continue;
        } else {
            to_upload.push(file)
        }
    }

    log::debug!("files sorted");
    for upload in to_upload {
        let copy_endpoint = endpoint.clone();
        let copy_client = client.clone();
        let copy_token = user.clone();
        let abspath = project_dir.clone() + "\\" + &upload.path;
        let file_hash = upload.hash.clone();
        let cloned_app = app_handle.clone();

        // 4 mb chunks
        log::debug!("chunking file {}", abspath.clone());
        let chunks: Vec<Chunk> = fs_chunker::chunk_file(&abspath, 4 * 1024 * 1024, true);
        log::debug!("chunking file complete");
        let len = chunks.len();
        let copied_client = &copy_client;
        let chunk_reqs = stream::iter(chunks)
            .map(|chunk| {
                let copied_endpoint = copy_endpoint.clone();
                let copied_token = copy_token.clone();
                let copied_filehash = file_hash.clone();
                async move {
                    let Chunk { hash, data, idx } = chunk;
                    println!("block hash: {}\tfile hash: {}", hash, copied_filehash);
                    let form: Form = reqwest::multipart::Form::new()
                        .part("chunk", Part::bytes(data).file_name(hash.clone()))
                        .text("file_hash", copied_filehash)
                        .text("block_hash", hash)
                        .text("num_chunks", len.to_string())
                        .text("chunk_index", idx.to_string())
                        .text("user_id", copied_token);
                    let res = copied_client
                        .post(copied_endpoint)
                        .multipart(form)
                        .send()
                        .await;
                    res
                }
            })
            .buffer_unordered(CONCURRENT_UPLOAD_REQUESTS);

        let error_flag = Arc::new(Mutex::new(false));
        chunk_reqs
            .for_each(|res| async {
                let _output: String = match res {
                    Ok(response) => {
                        let response_json: UploadResponse =
                            match response.json::<UploadResponse>().await {
                                Ok(out) => out,
                                Err(err) => {
                                    log::error!("error uploading a chunk: {}", err);
                                    UploadResponse {
                                        response: "error".to_string(),
                                        error: Some("parsing error".to_string()),
                                        body: None,
                                    }
                                }
                            };
                        let res = response_json.response;
                        if res == "error" {
                            log::error!(
                                "encountered glassy server error: {}",
                                response_json.error.unwrap()
                            );
                            let mut error = error_flag.lock().await;
                            *error = true;
                            res
                        } else {
                            res
                        }
                    }
                    Err(err) => {
                        let reqwest_error =
                            "error uploading chunk: ".to_string() + &err.to_string();
                        log::error!("error uploading a chunk: {}", err);
                        let mut error = error_flag.lock().await;
                        *error = true;
                        reqwest_error
                    }
                };
            })
            .await;

        if *error_flag.lock().await {
            return Ok(UploadChunkResponse { success: false, error: UploadChunkError::ErrGeneric, message: None });
        }
        let _ = cloned_app.emit("fileAction", 6030);
    }

    log::debug!("files uploaded!");
    Ok(UploadChunkResponse { success: true, error: UploadChunkError::ErrOk, message: None })
}

#[derive(Serialize, Deserialize)]
pub struct UploadedFile {
    pub path: String,
    pub hash: String,
    pub changetype: i32,
}

#[tauri::command]
pub async fn update_uploaded(
    pid: i32,
    commit: i32,
    files: Vec<UploadedFile>,
    state_mutex: State<'_, Mutex<Pool<Sqlite>>>,
) -> Result<bool, ()> {
    let pool = state_mutex.lock().await;

    log::debug!("updating db with uploaded files...");
    for file in files {
        if file.changetype == 3 {
            // delete
            let owo = sqlx::query(
                "DELETE FROM file
                WHERE pid = $1 AND filepath = $2",
            )
            .bind(pid)
            .bind(file.path.clone())
            .execute(&*pool)
            .await;
            match owo {
                Ok(_) => {}
                Err(err) => {
                    log::error!(
                        "encountered error when deleting {} from db for project {}: {}",
                        file.path,
                        pid,
                        err
                    );
                }
            }
        } else if file.changetype == 1 || file.changetype == 2 {
            let uwu = sqlx::query(
                "UPDATE file SET
                change_type = 0,
                base_hash = curr_hash,
                tracked_hash = curr_hash,
                base_commitid = $1,
                tracked_commitid = $1
                WHERE pid = $2 AND filepath = $3",
            )
            .bind(commit)
            .bind(pid)
            .bind(file.path.clone())
            .execute(&*pool)
            .await;

            match uwu {
                Ok(_) => {}
                Err(err) => {
                    log::error!(
                        "encountered error when updating {} from db for project {}: {}",
                        file.path,
                        pid,
                        err
                    );
                }
            }
        }
    }

    Ok(true)
}
