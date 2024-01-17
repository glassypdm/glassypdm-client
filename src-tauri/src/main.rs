// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod download;
mod sync;
mod settings;
mod types;
mod upload;
mod util;

use tauri::Manager;
use tauri_plugin_log::LogTarget;
use crate::sync::{hash_dir, sync_server};
use crate::settings::{update_server_url, get_server_url, get_project_dir, update_project_dir};
use crate::types::SingleInstancePayload;
use crate::upload::{update_upload_list, upload_files};
use crate::download::{download_s3_file, download_files, delete_file};



fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
            println!("{}, {argv:?}, {cwd}", app.package_info().name);
            app.emit_all("single-instance", SingleInstancePayload { args: argv, cwd }).unwrap();
        }))
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
