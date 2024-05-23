// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use sqlx::{SqlitePool, Row, Pool, Sqlite};
use tauri::{App, AppHandle, Manager};
use tauri_plugin_sql::{Migration, MigrationKind};
use walkdir::WalkDir;
use std::path::{Path, PathBuf};
use fs_chunker::{Chunk, hash_file};
use std::time::Instant;
use tauri::State;
use tokio::sync::Mutex;


async fn hash_dir(dir_path: PathBuf, db_path: PathBuf, handle: &AppHandle) {
    println!("start");
    let now = Instant::now();
    
    println!("connected to db");
    //let mut conn = pool.acquire().await.unwrap();

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
async fn sync_changes(pid: i32, handle: AppHandle) {
    println!("pid: {}", pid);

    let data_dir = handle.path().app_data_dir().unwrap();
    println!("data_dir: {}", data_dir.display());
    hash_dir("C:\\FSAE\\GrabCAD\\SDM24\\DAQ".into(), data_dir.join("glassypdm.db"), &handle).await;
    println!("done");
}

#[tauri::command]
async fn get_server_url(debug: bool, state_mutex: State<'_, Mutex<Pool<Sqlite>>>) -> Result<String, ()> {
    let pool = state_mutex.lock().await;

    let output;
    if debug {
        output = sqlx::query("SELECT debug_url as url FROM server WHERE active = 1").fetch_one(&*pool).await.unwrap();
    } else {
        output = sqlx::query("SELECT url FROM server WHERE active = 1").fetch_one(&*pool).await.unwrap();
    }
    println!("{:?}", output.get::<String, &str>("url"));
    Ok(output.get::<String, &str>("url"))
}

#[tauri::command]
async fn get_server_clerk(handle: AppHandle) -> String {
    let db_path = handle.path().app_data_dir().unwrap().join("glassypdm.db");
    let pool = SqlitePool::connect(db_path.to_str().unwrap()).await.unwrap();
    let output = sqlx::query("SELECT clerk_publickey FROM server WHERE active = 1").fetch_one(&pool).await.unwrap();

    pool.close().await;
    return output.get::<String, &str>("clerk_publickey");
}

fn main() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql:"CREATE TABLE server (url TEXT PRIMARY KEY, name TEXT, clerk_publickey TEXT, local_dir TEXT, active INTEGER, debug_url TEXT, debug_active INTEGER);
            CREATE TABLE project (id INTEGER PRIMARY KEY, server_url TEXT, name TEXT, active INTEGER, current_commitid INTEGER);
            CREATE TABLE file (path TEXT PRIMARY KEY);
            ", // TODO determine file schema
            kind: MigrationKind::Up,
        }
    ];

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![sync_changes, get_server_url, get_server_clerk])
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:glassypdm.db", migrations)
                .build(),
        )
        .setup(|app| {
            tauri::async_runtime::block_on(async move {
                let db_path = app.path().app_data_dir().unwrap().join("glassypdm.db");
                let pool = SqlitePool::connect(db_path.to_str().unwrap()).await.unwrap();
                app.manage(Mutex::new(pool.clone()));
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
