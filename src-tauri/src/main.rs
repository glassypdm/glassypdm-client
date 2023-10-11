// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::PathBuf;
use std::path::Path;
use serde::{Serialize, Deserialize};
use tauri::api::dialog;
use tauri::{CustomMenuItem, Menu, Submenu, Manager};
use merkle_hash::{bytes_to_hex, Algorithm, MerkleTree, anyhow::Error};
use std::fs::{File, self, create_dir_all};
use std::io::{Read, Write};
use std::io;
use reqwest::blocking::multipart::*;

#[derive(Serialize, Deserialize)]
struct LocalCADFile {
    path: String,
    size: u64,
    hash: String
}

#[derive(Serialize, Deserialize)]
struct S3FileLink {
    path: String,
    url: String,
    key: String
}

#[derive(Serialize, Deserialize)]
struct UploadStatus {
    result: bool,
    s3key: String
}

#[tauri::command]
fn download_s3_file(app_handle: tauri::AppHandle, link: S3FileLink) {
    println!("download");
    let mut resp = reqwest::blocking::get(link.url).unwrap();
    let path = get_project_dir(app_handle.clone()) + link.path.as_str();
    let p: &Path = std::path::Path::new(&path);
    let prefix = p.parent().unwrap();
    println!("prefix: {}", &prefix.display());
    fs::create_dir_all(prefix).unwrap();
    //let cache_prefix: String = get_project_dir(app_handle.clone()) + "\\.glassypdm";
    //fs::create_dir_all(cache_prefix.clone()).unwrap();

    let mut f = File::create(&path).expect("Unable to create file");
    io::copy(&mut resp, &mut f).expect("Unable to copy data");
    //let mut cache: File = File::create(cache_prefix.clone() + "\\" + link.key.as_str()).expect("unable to create cache file");
    //io::copy(&mut resp, &mut cache).expect("Unable to copy data");
    println!("finish");
    println!("loc: {}", path);
}

#[tauri::command]
fn delete_file(app_handle: tauri::AppHandle, file: String) {
    let path = get_project_dir(app_handle) + file.as_str();
    let _ = fs::remove_file(path);
}

#[tauri::command]
fn upload_changes(app_handle: tauri::AppHandle, file: LocalCADFile, commit: u64, server_url: String) -> Result<String, ()> {
    let client = reqwest::blocking::Client::new();
    let url = server_url.to_string() + "/ingest";
    println!("commit # {}; server url {}", commit, &url);

    let project_dir = get_project_dir(app_handle);
    println!("{}", project_dir);

    let path: String = file.path;
    let relative_path = path.replace(&project_dir, "");

    let mut form: Form;

    // TODO optimise, lol
    if file.size != 0 {
        println!("uploading {}", path);
        println!("relative {}", relative_path);
        form = reqwest::blocking::multipart::Form::new()
            .text("commit", commit.to_string())
            .text("path", relative_path)
            .text("size", file.size.to_string())
            .text("hash", file.hash)
            .text("project", 0.to_string())
            .file("key", path).unwrap();
    } else {
        // deleted file
        println!("relative {} (deleting!)", relative_path);
        form = reqwest::blocking::multipart::Form::new()
            .text("commit", commit.to_string())
            .text("path", relative_path)
            .text("size", file.size.to_string())
            .text("project", 0.to_string())
            .text("hash", file.hash);
    }

    let res = client.post(url.to_string())
        .multipart(form)
        .send().unwrap();

    println!("{:?}", res);
    let data = res.json::<UploadStatus>().unwrap();
    let mut output = "oops".to_string();
    if data.result {
        output = data.s3key;
    }
    println!("upload done");
    Ok(output)
}

#[tauri::command]
fn update_server_url(app_handle: tauri::AppHandle, new_url: String) {
    let appdir = app_handle.path_resolver().app_local_data_dir().unwrap();
    let path = appdir.join("server_url.txt");

    let _ = fs::write(path, new_url);
}

#[tauri::command]
fn get_server_url(app_handle: tauri::AppHandle) -> String {
    let appdir = app_handle.path_resolver().app_local_data_dir().unwrap();
    let path = appdir.join("server_url.txt");
    let output: String = match fs::read_to_string(path) {
        Ok(contents) => return contents,
        Err(_err) => "http://example.com/".to_string(),
    };
    return output;
}

#[tauri::command]
fn get_project_dir(app_handle: tauri::AppHandle) -> String {
    let appdir = app_handle.path_resolver().app_local_data_dir().unwrap();
    let path = appdir.join("project_dir.txt");
    let output: String = match fs::read_to_string(path) {
        Ok(contents) => return contents,
        Err(_err) => "no project directory set".to_string(),
    };
    return output;
}

#[tauri::command]
fn update_project_dir(app_handle: tauri::AppHandle, dir: PathBuf) {
    println!("new project dir: {}", dir.display());

    let appdir = app_handle.path_resolver().app_local_data_dir().unwrap();
    let mut path = appdir.join("project_dir.txt");

    let _ = fs::write(path, pathbuf_to_string(dir));

    // update base.json
    path = appdir.join("base.json");
    hash_dir(app_handle, &pathbuf_to_string(path), Vec::new());
}

fn pathbuf_to_string(path: PathBuf) -> String {
    let output: String = path.into_os_string().into_string().unwrap();
    return output;
}

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    let output: String = format!("Hello, {}! You've been greeted from Rust!", name);
    println!("helasdfasdfasdfsdf");
    return output;
}

fn is_key_in_list(key: String, list: Vec<String>) -> bool {
    for str in list {
        if key == str {
            return true;
        }
    }
    return false;
}

#[tauri::command]
fn hash_dir(app_handle: tauri::AppHandle, results_path: &str, ignore_list: Vec<String>) {
    let path: String = get_project_dir(app_handle);
    if path == "no lol" {
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
            println!("ignoring a file! {}", ignored_file);
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

            println!("{}: {}", pathbuf, s_hash);
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

    println!("fn hash_dir done");
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            hash_dir, greet, get_project_dir, upload_changes, update_server_url,
            get_server_url, download_s3_file, update_project_dir, delete_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
