use serde::{Deserialize, Serialize};
use tauri::State;
use tokio::sync::Mutex;
use sqlx::{Pool, Sqlite, Row};
use tauri::{AppHandle, Manager};
use crate::types::{ChangeType, UpdatedFile};
use crate::util::{get_current_server, get_file_as_byte_vec, get_file_info, get_project_dir};
use reqwest::{Client, Response};
use reqwest::multipart::*;

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
            let _ = app_handle.emit("uploadedFile", uploaded);  
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

  Ok(true)
}

#[derive(Serialize, Deserialize)]
pub struct Hehez {
    pub path: String,
    pub hash: String,
    pub changetype: i32
}

#[tauri::command]
pub async fn update_uploaded(pid: i32, commit: i32, files: Vec<Hehez>, state_mutex: State<'_, Mutex<Pool<Sqlite>>>) -> Result<bool, ()> {
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