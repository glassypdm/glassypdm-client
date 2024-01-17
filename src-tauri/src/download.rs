use tauri::Manager;
use std::path::Path;
use std::fs::{File, self};
use std::io;
use reqwest::Client;
use log::{info, trace, error};
use futures::{stream, StreamExt};
use crate::settings::get_project_dir;
use crate::types::{ReqwestError, DownloadFile, DownloadInformation, DownloadStatusPayload};
use crate::util::{delete_from_base_store, upsert_into_base_store, hash_file};


const CONCURRENT_REQUESTS: usize = 4;

#[tauri::command]
pub async fn download_files(app_handle: tauri::AppHandle, files: Vec<DownloadFile>, server_url: String) -> Result<(), ReqwestError> {
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
                    let _ = download_with_client(handle, b, &aws_client, &project_dir).await;
                }
                Err(e) => error!("Got an error: {}", e),
            }

            handle.emit_all("downloadStatus", DownloadStatusPayload {
                s3: key.to_string(),
                rel_path: rel_path.to_string()
            }).unwrap();
        }).await;
    
    for file in to_delete {
        delete_file(app_handle.clone(), file.rel_path.clone());
        delete_from_base_store(app_handle.clone(), &file.rel_path);
        app_handle.emit_all("downloadStatus", DownloadStatusPayload {
            s3: "delete".to_string(),
            rel_path: "delete".to_string()
        }).unwrap();
    }

    Ok(())
}

async fn download_with_client(app_handle: &tauri::AppHandle, download: DownloadInformation, client: &Client, dir: &String) -> Result<(), ReqwestError> {
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

    upsert_into_base_store(app_handle.clone(), hash_file(&abs_path));
    Ok(())
}

#[tauri::command]
pub fn download_s3_file(app_handle: tauri::AppHandle, link: DownloadInformation) -> bool {
    info!("downloading a file");
    let mut resp = reqwest::blocking::get(link.s3Url).unwrap();
    let path = get_project_dir(app_handle.clone()) + link.relPath.as_str();
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
    io::copy(&mut resp, &mut f).expect("Unable to download data");

    return true;
}

#[tauri::command]
pub fn delete_file(app_handle: tauri::AppHandle, file: String) {
    let path = get_project_dir(app_handle) + file.as_str();
    let _ = fs::remove_file(path);
}