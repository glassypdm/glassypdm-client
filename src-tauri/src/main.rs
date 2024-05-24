// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use serde::{Deserialize, Serialize};
use sqlx::{SqlitePool, Row, Pool, Sqlite, sqlite::SqliteConnectOptions};
use sqlx::migrate::Migrator;
use tauri::{App, AppHandle, Manager};
use walkdir::WalkDir;
use std::path::{Path, PathBuf};
use fs_chunker::{Chunk, hash_file};
use std::time::Instant;
use tauri::State;
use tokio::sync::Mutex;


async fn hash_dir(dir_path: PathBuf, pool: &Pool<Sqlite>) {
    println!("start");
    let now = Instant::now();

    for entry in WalkDir::new(dir_path) {
        let file = entry.unwrap();
        if !file.metadata().unwrap().is_file() {
            continue;
        }
        let chunk_list: Vec<String> = hash_file(file.path(), 4 * 1024 * 1024, true); // 4 MB chunks
        //println!("{}, {} chunks", file.path().display(), chunk_list.len());
    }

    println!("end: {} ms", now.elapsed().as_millis());
}

#[tauri::command]
async fn sync_changes(pid: i32, state_mutex: State<'_, Mutex<Pool<Sqlite>>>) -> Result<(), ()> {
    let pool = state_mutex.lock().await;
    println!("pid: {}", pid);

    //let data_dir = handle.path().app_data_dir().unwrap();
    //println!("data_dir: {}", data_dir.display());
    hash_dir("C:\\FSAE\\GrabCAD\\SDM24\\DAQ".into(), &pool).await;
    println!("done");
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

#[tauri::command]
async fn get_server_url(state_mutex: State<'_, Mutex<Pool<Sqlite>>>) -> Result<String, ()> {
    let pool = state_mutex.lock().await;

    let output = sqlx::query("SELECT CASE WHEN debug_active = 1 THEN debug_url ELSE url END as url FROM server WHERE active = 1").fetch_one(&*pool).await;

    match output {
        Ok(row) => {
            Ok(row.get::<String, &str>("url"))
        },
        Err(err) => {
            println!("asdfasdf {}", err); // TODO ???
            todo!()
        }
    }
}

#[tauri::command]
async fn set_debug(debug: i32, state_mutex: State<'_, Mutex<Pool<Sqlite>>>) -> Result<(), ()> {
    let pool = state_mutex.lock().await;

    let _ = sqlx::query(
        "UPDATE server SET debug_active = ? WHERE active = 1"
    )
        .bind(debug)
        .execute(&*pool).await;

    Ok(())
}

#[tauri::command]
async fn get_server_clerk(state_mutex: State<'_, Mutex<Pool<Sqlite>>>) -> Result<String, ()> {
    let pool = state_mutex.lock().await;
    let output = sqlx::query("SELECT clerk_publickey FROM server WHERE active = 1").fetch_one(&*pool).await;
    match output {
        Ok(row) => {
            Ok(row.get::<String, &str>("clerk_publickey"))
        },
        Err(err) => {
            // TODO better way to handle error?
            println!("ooga booga {}", err);
            Ok("".to_string())
        }
    }
}

#[tauri::command]
async fn add_server(url: String, clerk: String, local_dir: String, name: String, state_mutex: State<'_, Mutex<Pool<Sqlite>>>) -> Result<bool, ()> {
    let pool = state_mutex.lock().await;
    sqlx::query(
            "INSERT INTO server (url, clerk_publickey, local_dir, name, active, debug_url, debug_active) VALUES (?, ?, ?, ?, ?, ?, ?);"
    )
        .bind(url)
        .bind(clerk)
        .bind(local_dir)
        .bind(name)
        .bind(1)
        .bind("http://localhost:5000")
        .bind(0)
        .execute(&*pool)
        .await.unwrap();
    Ok(true)
}

#[derive(Serialize, Deserialize)]
struct SettingsOptions {
    pub local_dir: String,
    pub debug_active: i32
}

#[tauri::command]
async fn init_settings_options(state_mutex: State<'_, Mutex<Pool<Sqlite>>>) -> Result<SettingsOptions, ()> {
    let pool = state_mutex.lock().await;
    println!("init seafsdf");

    let output = sqlx::query(
        "SELECT local_dir, debug_active FROM server WHERE active = 1"
    ).fetch_one(&*pool).await;

    match output {
        Ok(row) => {
            println!("{} {}", row.get::<String, &str>("local_dir"), row.get::<i32, &str>("debug_active"));
            Ok(SettingsOptions {
                local_dir: row.get::<String, &str>("local_dir").to_string(),
                debug_active: row.get::<i32, &str>("debug_active")
            })
        },
        Err(err) => {
            // TODO do something with error, and handle this case better lol
            Ok(SettingsOptions {
                local_dir: "".to_string(),
                debug_active: 0
            })
        }
    }
}

fn main() {

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            sync_changes, set_local_dir, set_debug, get_server_url,
            get_server_clerk, add_server, init_settings_options])
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
                        let owo = app.path().resource_dir().unwrap().join("migrations");
                        let m = Migrator::new(owo).await.unwrap(); // TODO refactor unwrap() if possible
                        let _ = m.run(&db).await; // TODO parse error

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
