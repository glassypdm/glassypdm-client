// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod changes;
mod settings;
mod types;
mod util;

use std::path::Path;
use tauri::Manager;
use std::fs::{File, self};
use std::io;
use reqwest::{Client, Response};
use reqwest::multipart::*;
use tauri_plugin_log::LogTarget;
use log::{info, trace, error};
use futures::{stream, StreamExt};
use crate::changes::hash_dir;
use crate::settings::{update_server_url, get_server_url, get_project_dir, update_project_dir};
use crate::types::{UploadStatusPayload, Change, S3FileLink, FileUploadStatus, ReqwestError, DownloadFile, DownloadInformation, DownloadStatusPayload};
use crate::util::get_file_as_byte_vec;

const CONCURRENT_REQUESTS: usize = 3;

#[tauri::command]
async fn download_files(app_handle: tauri::AppHandle, files: Vec<DownloadFile>, server_url: String) -> Result<(), ReqwestError> {
    let glassy_client: Client = reqwest::Client::new();
    let aws_client: Client = reqwest::Client::new();
    let project_dir = get_project_dir(app_handle.clone());
    let total: u32 = files.len().try_into().unwrap();

    let mut to_download: Vec<DownloadFile> = Vec::new();
    let mut to_delete: Vec<DownloadFile> = Vec::new();
    for file in files {
        if file.size == 0 {
            to_delete.push(file);
        }
        else {
            to_download.push(file);
        }
    }

    let bodies = stream::iter(to_download)
        .map(|file| {
            let g_client = &glassy_client;
            let key = file.rel_path.replace("\\", "|");
            let url = server_url.clone() + "/download/file/" + &key;
            async move {
                let response = g_client
                    .get(url)
                    .send()
                    .await?;
                response.json::<DownloadInformation>()
                    .await
            }
        })
        .buffer_unordered(CONCURRENT_REQUESTS);

    bodies
        .for_each(|b| async {
            let handle = &app_handle;
            let mut key: String = "oops".to_string();
            let mut rel_path: String = "bruh".to_string();
            match b {
                Ok(b) => {
                    println!("hehehe {}", b.relPath);
                    key = b.key.to_string();
                    rel_path = b.relPath.to_string();
                    let _ = hehe_file(b, &aws_client, &project_dir).await;
                }
                Err(e) => error!("Got an error: {}", e),
            }

            handle.emit_all("downloadStatus", DownloadStatusPayload {
                total,
                s3: key.to_string(),
                rel_path: rel_path.to_string()
            }).unwrap();
        }).await;
    
    for file in to_delete {
        delete_file(app_handle.clone(), file.rel_path);

        app_handle.emit_all("downloadStatus", DownloadStatusPayload {
            total,
            s3: "delete".to_string(),
            rel_path: "delete".to_string()
        }).unwrap();
    }

    Ok(())
}

async fn hehe_file(download: DownloadInformation, client: &Client, dir: &String) -> Result<(), ReqwestError> {
    let resp = client
        .get(download.s3Url)
        .send()
        .await?
        .bytes()
        .await?;
    let abs_path = dir.to_owned() + download.relPath.as_str();
    let p: &Path = std::path::Path::new(&abs_path);

    // create necessary folders
    let prefix = p.parent().unwrap();
    println!("prefix: {}", &prefix.display());
    fs::create_dir_all(prefix).unwrap();

    // create file
    let mut f = File::create(&abs_path).expect("Unable to create file");
    io::copy(&mut &resp[..], &mut f).expect("Unable to copy data");
    Ok(())
}

#[tauri::command]
fn download_s3_file(app_handle: tauri::AppHandle, link: S3FileLink) {
    info!("downloading a file");
    let mut resp = reqwest::blocking::get(link.url).unwrap();
    let path = get_project_dir(app_handle.clone()) + link.path.as_str();
    let p: &Path = std::path::Path::new(&path);
    let prefix = p.parent().unwrap();
    fs::create_dir_all(prefix).unwrap();

    let mut f = File::create(&path).expect("Unable to create file");
    io::copy(&mut resp, &mut f).expect("Unable to copy data");
}

#[tauri::command]
fn delete_file(app_handle: tauri::AppHandle, file: String) {
    let path = get_project_dir(app_handle) + file.as_str();
    let _ = fs::remove_file(path);
}

#[tauri::command]
async fn upload_files(app_handle: tauri::AppHandle, files: Vec<Change>, commit: u64, server_url: String) -> Result<(), ReqwestError> {
    let client: Client = reqwest::Client::new();
    let url: String = server_url.to_string() + "/ingest";

    let project_dir = get_project_dir(app_handle.clone());
    let total: u32 = files.len().try_into().unwrap();
    let mut uploaded: u32 = 0;
    for file in files {
        let path: String = file.path;
        let rel_path = path.replace(&project_dir, "");

        // create request
        let mut form: Form = reqwest::multipart::Form::new()
        .text("project", 0.to_string())
        .text("commit", commit.to_string())
        .text("path", rel_path.clone())
        .text("size", file.size.to_string())
        .text("change", file.change.to_string())
        .text("hash", file.hash);
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

        // emit status event
        uploaded += 1;
        app_handle.emit_all("uploadStatus", UploadStatusPayload { uploaded, total, s3, rel_path }).unwrap();
    }
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_log::Builder::default().targets([
            LogTarget::LogDir,
            LogTarget::Stdout
        ]).build())
        .invoke_handler(tauri::generate_handler![
            hash_dir, get_project_dir, update_server_url, upload_files, download_files,
            get_server_url, download_s3_file, update_project_dir, delete_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
