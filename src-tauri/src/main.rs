// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod util;
mod settings;
mod types;

use std::path::PathBuf;
use std::path::Path;
use merkle_hash::{bytes_to_hex, Algorithm, MerkleTree, anyhow::Error};
use tauri::Manager;
use types::DownloadFile;
use std::fs::{File, self};
use std::io::{Read, Write};
use std::io;
use reqwest::{Client, Response};
use reqwest::multipart::*;
use tauri_plugin_log::LogTarget;
use log::{info, trace, error};
use crate::util::{is_key_in_list, pathbuf_to_string, get_file_as_byte_vec};
use crate::settings::{update_server_url, get_server_url, get_project_dir};
use crate::types::{LocalCADFile, UploadStatusPayload, Change, S3FileLink, FileUploadStatus, ReqwestError};

#[tauri::command]
async fn download_files(app_handle: tauri::AppHandle, files: Vec<DownloadFile>, server_url: String) -> Result<(), ReqwestError> {

}

#[tauri::command]
fn download_s3_file(app_handle: tauri::AppHandle, link: S3FileLink) {
    info!("downloading a file");
    let mut resp = reqwest::blocking::get(link.url).unwrap();
    let path = get_project_dir(app_handle.clone()) + link.path.as_str();
    let p: &Path = std::path::Path::new(&path);
    let prefix = p.parent().unwrap();
    println!("prefix: {}", &prefix.display());
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

#[tauri::command]
fn update_project_dir(app_handle: tauri::AppHandle, dir: PathBuf) {
    let appdir = app_handle.path_resolver().app_local_data_dir().unwrap();
    let mut path = appdir.join("project_dir.txt");
    let _ = fs::write(path, pathbuf_to_string(dir));

    // update base.json
    path = appdir.join("base.json");
    //let _ = fs::write(path, "[]");
    hash_dir(app_handle, &pathbuf_to_string(path), Vec::new());
}

#[tauri::command]
fn hash_dir(app_handle: tauri::AppHandle, results_path: &str, ignore_list: Vec<String>) {
    trace!("hashing project directory");
    let path: String = get_project_dir(app_handle);
    if path == "no lol" {
        error!("hashing failed; invalid project directory");
        return;
    }
    
    let mut files: Vec<LocalCADFile> = Vec::new();

    // first, handle ignorelist
    let base_data: String = match fs::read_to_string(results_path) {
        Ok(content) => content,
        Err(_error) => "bruh".to_string(),
    };
    if base_data != "bruh" {
        let base_json: Vec<LocalCADFile> = serde_json::from_str(&base_data).expect("base.json not formatted");
        for ignored_file in &ignore_list {
            info!("ignoring file {}", ignored_file);
            for file in &base_json {
                if file.path == ignored_file.clone() {
                    let output: LocalCADFile = LocalCADFile {
                        path: ignored_file.clone(),
                        size: file.size,
                        hash: file.hash.clone()
                    };
                    files.push(output);
                }
            }
        }
    }
    else {
        error!("base.json DNE");
    }

    // build hash
    let do_steps = || -> Result<(), Error> {
        let tree = MerkleTree::builder(path)
        .algorithm(Algorithm::Blake3)
        .hash_names(true)
        .build().unwrap();

        for item in tree {
            let pathbuf = item.path.absolute.into_string();
            let s_hash = bytes_to_hex(item.hash);

            if pathbuf.as_str() == "" {
                continue;
            }
            let metadata = std::fs::metadata(pathbuf.as_str())?;
            let isthisfile = metadata.is_file();
            let filesize = metadata.len();

            // ignore if directory
            if !isthisfile {
                continue;
            }

            // if file is in ignorelist, we already handled it
            // so ignore it
            if is_key_in_list(pathbuf.clone(), ignore_list.clone()) {
                continue;
            }

            // ignore temporary solidworks files
            if pathbuf.as_str().contains("~$") {
                continue;
            }

            //println!("{}: {}", pathbuf, s_hash);
            let file = LocalCADFile {
                hash: s_hash,
                path: pathbuf,
                size: filesize,
            };
            files.push(file);
        }

        let json = serde_json::to_string(&files)?;

        let mut file = File::create(results_path)?;
        file.write_all(json.as_bytes())?;
        Ok(())
    };
    let _ = do_steps();

    trace!("fn hash_dir done");
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
            get_server_url, download_s3_file, update_project_dir, delete_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
