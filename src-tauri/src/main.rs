// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod config;
mod types;
mod util;

use sqlx::{SqlitePool, Row, Pool, Sqlite, sqlite::SqliteConnectOptions};
use sqlx::migrate::Migrator;
use tauri::{AppHandle, Manager};
use tauri::path::BaseDirectory;
use jwalk::WalkDir;
use std::fs;
use std::os::windows::fs::MetadataExt;
use std::path::{Path, PathBuf};
use fs_chunker::hash_file;
use std::time::Instant;
use tauri::State;
use tokio::sync::Mutex;
use crate::config::*;

async fn hash_dir(pid: i32, dir_path: PathBuf, pool: &Pool<Sqlite>) {
    println!("start");
    let now = Instant::now();

    let _ = sqlx::query("UPDATE file SET in_fs = 0;").execute(&*pool).await;

    for entry in WalkDir::new(dir_path) {
        let file = entry.unwrap();
        if !file.metadata().unwrap().is_file() {
            continue;
        }

        // update chunk table
        let hash_list: Vec<String> = hash_file(file.path(), 4 * 1024 * 1024, true); // 4 MB chunks
        for (pos, hash) in hash_list.iter().enumerate() {
            let _ = sqlx::query(
                "
                INSERT INTO chunk(filepath, chunk_num, curr_hash) VALUES(?, ?, ?)
                ON CONFLICT(filepath, chunk_num) DO UPDATE SET curr_hash = excluded.curr_hash;
                "
            )
            .bind(file.path().to_str())
            .bind(pos as i32)
            .bind(hash)
            .execute(&*pool).await;
        }

        // update file table and set in_fs = 1
        let _ = sqlx::query(
            "
            INSERT INTO file(filepath, pid, num_chunks, size) VALUES(?, ?, ?, ?)
            ON CONFLICT(filepath) DO UPDATE SET num_chunks = excluded.num_chunks, size = excluded.size, in_fs = 1,
            change_type = CASE WHEN (
                SELECT COUNT(*) FROM chunk WHERE
                chunk.filepath = excluded.filepath AND
                chunk.curr_hash != chunk.base_hash AND
                chunk.chunk_num < excluded.num_chunks
                ORDER BY chunk_num LIMIT(excluded.num_chunks)
            )
            THEN 2 ELSE 0 END;
            "
        )
        .bind(file.path().to_str())
        .bind(pid)
        .bind(hash_list.len() as u32)
        .bind(file.metadata().unwrap().file_size() as u32)
        .execute(&*pool).await;
    }

    // update change type for files with in_fs = 0 (deleted)
    let _ = sqlx::query(
        "UPDATE file SET change_type = 3 WHERE in_fs = 0;"
    ).execute(&*pool).await;


    println!("end: {} ms", now.elapsed().as_millis());
}

// precondition: we have a server_url
#[tauri::command]
async fn sync_changes(pid: i32, name: String, state_mutex: State<'_, Mutex<Pool<Sqlite>>>) -> Result<(), ()> {
    let pool = state_mutex.lock().await;
    let glassy_dir = get_server_dir(&pool).await.unwrap();
    let project_dir = glassy_dir + "\\" + &name; // TODO generalize based on OS

    // create folder if it does not exist
    let _ = fs::create_dir_all(&project_dir);
    println!("dir: {}", project_dir);
    hash_dir(pid, "dir".into(), &pool).await;
    println!("hashing done");

    // TODO get updated version of project
    // client should send server a filepath and the base commit
    // if there is a new version, server responds with chunk list and tracked commit
    // otherwise, response is up to date and tracked commit should be set equal to base commit
    Ok(())
}

#[tauri::command]
async fn set_local_dir(dir: String, state_mutex: State<'_, Mutex<Pool<Sqlite>>>) -> Result<(), ()> {
    let pool = state_mutex.lock().await;
    
    let _ = sqlx::query(
        "UPDATE server SET local_dir = ? WHERE active = 1"
    )
        .bind(dir)
        .execute(&*pool).await;

    Ok(())
}

fn main() {

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            sync_changes, set_local_dir, set_debug, get_server_url,
            get_server_clerk, add_server, init_settings_options, get_server_name
            ])
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            tauri::async_runtime::block_on(async move {

                let db_path = app.path().app_data_dir().unwrap().join("glassypdm.db");
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
                        // TODO what errors could we get?
                    }
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
