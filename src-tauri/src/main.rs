// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod sync;
mod settings;
mod types;
mod upload;
mod util;

use std::path::Path;
use tauri::Manager;
use std::fs::{File, self};
use std::io;
use reqwest::Client;
use tauri_plugin_log::LogTarget;
use log::{info, trace, error};
use futures::{stream, StreamExt};
use crate::sync::{hash_dir, sync_server};
use crate::settings::{update_server_url, get_server_url, get_project_dir, update_project_dir};
use crate::types::{S3FileLink, ReqwestError, DownloadFile, DownloadInformation, DownloadStatusPayload};
use crate::upload::{update_upload_list, upload_files};

const CONCURRENT_REQUESTS: usize = 4;

#[tauri::command]
async fn download_files(app_handle: tauri::AppHandle, files: Vec<DownloadFile>, server_url: String) -> Result<(), ReqwestError> {
    let glassy_client: Client = reqwest::Client::new();
    let aws_client: Client = reqwest::Client::new();
    let project_dir = get_project_dir(app_handle.clone());

    // separate files that need to be downloaded vs deleted
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
            info!("downloading file {}", file.rel_path);
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
                    key = b.key.to_string();
                    rel_path = b.relPath.to_string();
                    let _ = hehe_file(b, &aws_client, &project_dir).await;
                }
                Err(e) => error!("Got an error: {}", e),
            }

            handle.emit_all("downloadStatus", DownloadStatusPayload {
                s3: key.to_string(),
                rel_path: rel_path.to_string()
            }).unwrap();
        }).await;
    
    for file in to_delete {
        delete_file(app_handle.clone(), file.rel_path);

        app_handle.emit_all("downloadStatus", DownloadStatusPayload {
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
    fs::create_dir_all(prefix).unwrap();

    // create file
    let mut f = File::create(&abs_path).expect("Unable to create file");
    io::copy(&mut &resp[..], &mut f).expect("Unable to copy data");
    Ok(())
}

#[tauri::command]
fn download_s3_file(app_handle: tauri::AppHandle, link: S3FileLink) -> bool {
    info!("downloading a file");
    let mut resp = reqwest::blocking::get(link.url).unwrap();
    let path = get_project_dir(app_handle.clone()) + link.path.as_str();
    let p: &Path = std::path::Path::new(&path);
    let prefix = p.parent().unwrap();
    fs::create_dir_all(prefix).unwrap();

    let mut f = match File::create(&path) {
        Ok(file) => file,
        Err(err) => {
            error!("Encountered error: {err}");
            return false;
            //panic!("unable to create file object for writing");
        }
    };
    io::copy(&mut resp, &mut f).expect("Unable to copy data");

    return true;
}

#[tauri::command]
fn delete_file(app_handle: tauri::AppHandle, file: String) {
    let path = get_project_dir(app_handle) + file.as_str();
    let _ = fs::remove_file(path);
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_log::Builder::default().targets([
            LogTarget::LogDir,
            LogTarget::Stdout
        ]).build())
        .invoke_handler(tauri::generate_handler![
            hash_dir, get_project_dir, update_server_url, upload_files,
            download_files, sync_server, update_upload_list,
            get_server_url, download_s3_file, update_project_dir, delete_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
