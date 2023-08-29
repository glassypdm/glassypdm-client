// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::PathBuf;
use tauri::api::dialog;
use tauri::{CustomMenuItem, Menu, MenuItem, Submenu};
use lazy_static::lazy_static;
use parking_lot::Mutex;
use merkle_hash::{bytes_to_hex, Algorithm, MerkleTree, anyhow::Error};

lazy_static! {
    static ref PATH: Mutex<PathBuf> = Mutex::new(PathBuf::new());
}

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    let output: String = format!("Hello, {}! You've been greeted from Rust!", name);
    println!("helasdfasdfasdfsdf");
    return output;
}

fn update_path(path: PathBuf) {
    println!("path: {}", path.display());
    *PATH.lock() = path;
}

#[tauri::command]
fn get_changes() {
    //let path: &str = "demo";
    let path_buf_obj: PathBuf = PATH.lock().to_path_buf();
    let path: &str = match path_buf_obj.to_str() {
        Some(p) => p,
        None => "demo"
    };
    let do_steps = || -> Result<(), Error> {
        let tree = MerkleTree::builder(path)
        .algorithm(Algorithm::Blake3)
        .hash_names(true)
        .build()?;

        for item in tree {
            println!("{}: {}", item.path.relative, bytes_to_hex(item.hash));
        }
        Ok(())
    };

    let _ = do_steps();
}

fn main() {
    let open = CustomMenuItem::new("open".to_string(), "Open");
    let file_menu = Submenu::new("File", Menu::new().add_item(open));
    let menu = Menu::new()
      .add_submenu(file_menu);

    tauri::Builder::default()
        .menu(menu)
        .on_menu_event(|event| match event.menu_item_id() {
        "open" => {
            dialog::FileDialogBuilder::default()
            .pick_folder(|path_buf| match path_buf {
                Some(p) => { println!("{}", p.display()); update_path(p)}
                _ => {}
            });
        }
        _ => {}
        })
        .invoke_handler(tauri::generate_handler![greet])
        .invoke_handler(tauri::generate_handler![get_changes])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
