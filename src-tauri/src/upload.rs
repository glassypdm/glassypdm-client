use serde::{Deserialize, Serialize};
use sqlx::{SqlitePool, sqlite::SqliteConnectOptions};
use sqlx::{Pool, Sqlite, Row};
use tauri::{AppHandle, Manager, State};
use crate::types::{ChangeType, UpdatedFile};
use crate::util::{get_current_server, get_file_as_byte_vec, get_file_info, get_project_dir};
use std::path::PathBuf;
use tokio::sync::Mutex;
use reqwest::{Client, Response};
use reqwest::multipart::*;

#[tauri::command]
pub async fn upload_files(pid: i32, filepaths: Vec<String>, token: String, app_handle: AppHandle) -> Result<(), ()> {
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
        let _ = app_handle.emit("uploadedFile", uploaded);        
    }

  Ok(())
}