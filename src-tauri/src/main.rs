// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::PathBuf;
use merkle_hash::camino::Utf8PathBuf;
use serde::{Serialize};
use tauri::api::dialog;
use tauri::{CustomMenuItem, Menu, MenuItem, Submenu};
use merkle_hash::{bytes_to_hex, Algorithm, MerkleTree, anyhow::Error};
use std::fs::{File, self};
use std::io::prelude::*;
use std::io::Read;
use reqwest::multipart::Part;

#[derive(Serialize)]
struct CADFile {
    path: String,
    size: u64,
    hash: String,
    is_file: bool
}

fn get_file_as_byte_vec(filename: &String) -> Vec<u8> {
    let mut f = File::open(&filename).expect("no file found");
    let metadata = fs::metadata(&filename).expect("unable to read metadata");
    let mut buffer = vec![0; metadata.len() as usize];
    f.read(&mut buffer).expect("buffer overflow");

    buffer
}

#[tauri::command]
async fn upload_changes(files: Vec<String>) -> Result<(), ()> {
    let client = reqwest::Client::new();

    // TODO: need to subtract project dir from file path
    for file in files {
        println!("uploading {}", file);
        let content: Vec<u8> = get_file_as_byte_vec(&file);
        let part = Part::bytes(content).file_name(file.clone());
        let request = reqwest::multipart::Form::new().part("key", part).text("path", file);

        let _response = client.post("http://localhost:5000/ingest")
            .multipart(request)
            .send().await;

    }

    Ok(())
}

#[tauri::command]
fn get_project_dir() -> String {
    let output = fs::read_to_string("..\\project_dir.txt").expect("no lol");
    return output;
}

fn update_project_dir(path: PathBuf) {
    println!("new project dir: {}", path.display());
    let _ = fs::write("..\\project_dir.txt", pathbuf_to_string(path));
    get_changes("..\\base.json");
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

#[tauri::command]
fn get_changes(results_path: &str) {
    let path: String = get_project_dir();
    if path == "no lol" {
        return;
    }
    
    let mut files: Vec<CADFile> = Vec::new();

    let do_steps = || -> Result<(), Error> {
        let tree = MerkleTree::builder(path)
        .algorithm(Algorithm::Blake3)
        .hash_names(true)
        .build()?;

        for item in tree {
            let pathbuf = item.path.absolute.into_string();
            let s_hash = bytes_to_hex(item.hash);

            println!("{}: {}", pathbuf, s_hash);
            if pathbuf.as_str() == "" {
                continue;
            }
            let metadata = std::fs::metadata(pathbuf.as_str())?;
            let isthisfile = metadata.is_file();
            let filesize = metadata.len();
            
            let file = CADFile {
                hash: s_hash,
                path: pathbuf,
                size: filesize,
                is_file: isthisfile
            };
            files.push(file);
        }

        let json = serde_json::to_string(&files)?;

        let mut file = File::create(results_path)?;
        file.write_all(json.as_bytes())?;
        Ok(())
    };
    let _ = do_steps();

    println!("fn get_changes done");
}

fn main() {
    let set_dir = CustomMenuItem::new("Set Project Directory".to_string(), "Set Project Directory");
    let file_menu = Submenu::new("Configure", Menu::new().add_item(set_dir));
    let menu = Menu::new()
      .add_submenu(file_menu);

    tauri::Builder::default()
        .menu(menu)
        .on_menu_event(|event| match event.menu_item_id() {
        "Set Project Directory" => {
            dialog::FileDialogBuilder::default()
            .pick_folder(|path_buf| match path_buf {
                Some(p) => {
                    println!("{}", p.display());
                    update_project_dir(p);
                }
                _ => {}
            });
        }
        _ => {}
        })
        .invoke_handler(tauri::generate_handler![get_changes, greet, get_project_dir, upload_changes])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
