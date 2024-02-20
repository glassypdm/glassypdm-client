use std::fs::{File, self};
use std::io::Write;
use std::path::PathBuf;
use log::{error, info};
use tauri::Manager;
use reqwest::{Client, Response};
use reqwest::multipart::*;
use tauri_plugin_store::StoreBuilder;
use crate::settings::{get_app_local_data_dir, get_project_dir};
use crate::types::{UploadStatusPayload, Change, FileUploadStatus, ReqwestError};
use crate::util::{get_file_as_byte_vec, upsert_into_base_store, delete_from_base_store};

#[tauri::command]
pub async fn upload_files(app_handle: tauri::AppHandle, files: Vec<Change>, commit: u64, server_url: String) -> Result<(), ReqwestError> {
    let client: Client = reqwest::Client::new();
    let url: String = server_url.to_string() + "/ingest";

    let project_dir = get_project_dir(app_handle.clone());
    let total: u32 = files.len().try_into().unwrap();
    let mut uploaded: u32 = 0;
    for change in files {
        let file = change.file;
        let path: String = file.path.clone();
        let rel_path = path.replace(&project_dir, "");

        // create request
        let mut form: Form = reqwest::multipart::Form::new()
        .text("project", 0.to_string())
        .text("commit", commit.to_string())
        .text("path", rel_path.clone())
        .text("size", file.size.to_string())
        .text("change", (change.change as u64).to_string())
        .text("hash", file.hash.clone());
        // TODO consider using file.change instead of file.file.size to see if we delete the file
        if file.size != 0 {
            let content: Vec<u8> = get_file_as_byte_vec(&path);
            form = form.part("key", Part::bytes(content).file_name(rel_path.clone()));
        }

        // send request
        let res: Response = client.post(url.to_string())
            .multipart(form)
            .send()
            .await?;
        
        // get s3 key and store it
        let data = res.json::<FileUploadStatus>().await?;
        let mut s3 = "oops".to_string();
        if data.result {
            s3 = data.s3key;
        }

        // update hash
        if file.size != 0 {
            upsert_into_base_store(app_handle.clone(), file);
        } else {
            delete_from_base_store(app_handle.clone(), &rel_path);
        }

        // emit status event
        uploaded += 1;
        app_handle.emit_all("uploadStatus", UploadStatusPayload { uploaded, total, s3, rel_path }).unwrap();
    }
    Ok(())
}

#[tauri::command]
pub fn update_upload_list(app_handle: tauri::AppHandle, changes: Vec<Change>) -> Vec<Change> {
    let mut data_dir: PathBuf = get_app_local_data_dir(&app_handle);
    data_dir.push("toUpload.json");
    let upload_str = match fs::read_to_string(&data_dir) {
        Ok(content) => content,
        Err(_error) => "n/a".to_string(),
    };

    if upload_str == "n/a" {
        error!("wasn't able to read toUpload.json");
        // TODO could handle this better, maybe panic instead?
        let output: Vec<Change> = Vec::new();
        return output;
    }
    let mut upload_list: Vec<Change> = serde_json::from_str(&upload_str).expect("toUpload.json not formatted");

    // remove files in the initial upload list that are in changes
    for change in changes {
        upload_list.retain(|file| file.file.path != change.file.path);
    }

    // write toUpload.json
    let json = match serde_json::to_string(&upload_list) {
        Ok(string) => string,
        Err(error) => {
            error!("Problem writing to toUpload.json: {}", error);
            panic!("Problem writing to toUpload.json: {}", error);
        },
    };

    let mut file = File::create(data_dir).unwrap();
    let _ = file.write_all(json.as_bytes());

    info!("toUpload.json updated");
    return upload_list;
}

#[tauri::command]
pub fn is_file_in_base(app_handle: tauri::AppHandle, abs_path: String) -> bool {
    let mut base_path = get_app_local_data_dir(&app_handle);
    base_path.push("base.dat");
    let mut store = StoreBuilder::new(app_handle.clone(), base_path).build();
    let _ = store.load();

    return store.has(abs_path);
}