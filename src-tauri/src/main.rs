// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod config;
mod download;
mod reset;
mod sync;
mod types;
mod upload;
mod util;

use crate::config::*;
use download::{download_files, download_single_file};
use log::{debug, error, info, warn};
use reset::reset_files;
use sqlx::migrate::Migrator;
use sqlx::{sqlite::SqliteConnectOptions, SqlitePool};
use std::fs;
use util::{cmd_delete_cache, get_cache_size, open_log_dir, open_app_data_dir};
use sync::{
    get_conflicts, get_downloads, get_local_projects, get_project_name, get_uploads,
    open_project_dir, sync_changes, update_project_info,
};
use tauri::path::BaseDirectory;
use tauri::{Emitter, Manager};
use tauri_plugin_updater::UpdaterExt;
use tokio::sync::Mutex;
use upload::{update_uploaded, upload_files};

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            sync_changes,
            set_local_dir,
            set_debug,
            get_server_url,
            get_server_clerk,
            add_server,
            init_settings_options,
            get_server_name,
            update_project_info,
            get_uploads,
            open_project_dir,
            get_project_name,
            upload_files,
            update_uploaded,
            get_local_projects,
            get_downloads,
            get_conflicts,
            download_files,
            reset_files,
            check_update,
            restart,
            cmd_delete_cache,
            get_cache_size,
            open_log_dir,
            open_app_data_dir,
            download_single_file,
            cmd_get_cache_setting,
            cmd_set_cache_setting
        ])
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::LogDir {
                        file_name: Some("glassy.log".to_string()),
                    },
                ))
                .max_file_size(50_000 /* bytes */)
                .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepAll)
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            //let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                //let _ = update(handle).await;
            });
            tauri::async_runtime::block_on(async move {
                let _ = fs::create_dir_all(app.path().app_data_dir().unwrap());
                let db_path = app.path().app_data_dir().unwrap().join("glassypdm.db");
                log::debug!("db {}", db_path.display());
                let options = SqliteConnectOptions::new()
                    .filename(db_path)
                    .create_if_missing(true);
                let pool = SqlitePool::connect_with(options).await;
                match pool {
                    Ok(db) => {
                        let migrations = app
                            .path()
                            .resolve("migrations", BaseDirectory::Resource)
                            .unwrap();
                        let m = Migrator::new(migrations).await.unwrap();
                        let res = m.run(&db).await;
                        match res {
                            Ok(()) => {}
                            Err(err) => {
                                error!("{}", err);
                            }
                        }
                        app.manage(Mutex::new(db.clone()));
                    }
                    Err(e) => {
                        // TODO what errors could we get? maybe panic and exit tauri
                        log::error!("db something wrong with connection? {}", e);
                    }
                }
                log::info!("done initializing");
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

async fn update(app: tauri::AppHandle) -> tauri::Result<()> {
    let update = app.updater().unwrap().check().await;
    match update {
        Ok(up) => {
            if up.is_some() {
                let mut downloaded = 0;

                // alternatively we could also call update.download() and update.install() separately
                let _ = up
                    .unwrap()
                    .download_and_install(
                        |chunk_length, content_length| {
                            downloaded += chunk_length;
                            info!("downloaded {downloaded} from {content_length:?}");
                        },
                        || {
                            info!("download finished");
                        },
                    )
                    .await;
                info!("updates installed");
                app.restart();
            } else {
                debug!("no update available");
            }
        }
        Err(err) => {
            warn!("error! {}", err);
            app.emit("update", 0).unwrap();
        }
    }

    Ok(())
}

#[tauri::command]
async fn check_update(app: tauri::AppHandle) -> Result<bool, ()> {
    let _ = update(app).await;
    return Ok(true);
}

#[tauri::command]
async fn restart(app: tauri::AppHandle) -> tauri::Result<()> {
    Ok(())
}
