// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod config;
mod download;
mod reset;
mod sync;
mod types;
mod util;
mod upload;

use sqlx::{SqlitePool, sqlite::SqliteConnectOptions};
use sqlx::migrate::Migrator;
use tauri::Manager;
use tauri::path::BaseDirectory;
use tokio::sync::Mutex;
use crate::config::*;
use std::fs;
use sync::{update_project_info, get_uploads, sync_changes, open_project_dir, get_project_name, get_local_projects, get_downloads, get_conflicts};
use upload::{upload_files, update_uploaded};
use reset::reset_files;
use download::{delete_file_cmd, download_s3_file, download_files};

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            sync_changes, set_local_dir, set_debug, get_server_url,
            get_server_clerk, add_server, init_settings_options, get_server_name, update_project_info,
            get_uploads, open_project_dir, get_project_name, upload_files, update_uploaded, get_local_projects,
            get_downloads, get_conflicts, delete_file_cmd, download_s3_file, download_files, reset_files
            ])
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            tauri::async_runtime::block_on(async move {
                let _ = fs::create_dir_all(app.path().app_data_dir().unwrap());
                let db_path = app.path().app_data_dir().unwrap().join("glassypdm.db");
                println!("db {}", db_path.display());
                let options = SqliteConnectOptions::new()
                    .filename(db_path)
                    .create_if_missing(true);
                let pool = SqlitePool::connect_with(options).await;
                match pool {
                    Ok(db) => {
                        let migrations = app.path().resolve("migrations", BaseDirectory::Resource).unwrap();
                        let m = Migrator::new(migrations).await.unwrap();
                        let res = m.run(&db).await;
                        match res {
                            Ok(()) => {},
                            Err(err) => {
                                println!("{}", err);
                            }
                        }
                        app.manage(Mutex::new(db.clone()));
                    },
                    Err(_) => {
                        // TODO what errors could we get? maybe panic and exit tauri
                    }
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
