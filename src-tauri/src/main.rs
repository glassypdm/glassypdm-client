// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use sqlx::{SqlitePool, Row};
use tauri_plugin_sql::{Migration, MigrationKind};
use walkdir::WalkDir;
use std::path::{Path, PathBuf};
use fs_chunker::{Chunk, hash_file};
use std::time::Instant;

async fn hash_dir(dir_path: PathBuf) {
    println!("start");
    let now = Instant::now();
    let pool = SqlitePool::connect("sqlite://glassypdm.db").await.unwrap();
    //let mut conn = pool.acquire().await.unwrap();

    for entry in WalkDir::new(dir_path) {
        let file = entry.unwrap();
        if !file.metadata().unwrap().is_file() {
            continue;
        }
        let chunk_list: Vec<String> = hash_file(file.path(), 4 * 1024 * 1024, true); // 4 MB
        //println!("{}, {} chunks", file.path().display(), chunk_list.len());
    }
    let output = sqlx::query(
        r#"
        SELECT url FROM server
        "#
    ).fetch_all(&pool).await.unwrap();
    for (idx, row) in output.iter().enumerate() {
        println!("[{}]: {:?}", idx, row.get::<String, &str>("url"));
    }
    println!("end: {} ms", now.elapsed().as_millis());
}

#[tauri::command]
async fn sync_changes(pid: i32) {
    println!("pid: {}", pid);

    hash_dir("C:\\FSAE\\GrabCAD\\SDM24\\DAQ".into()).await;
    println!("done");
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
        .invoke_handler(tauri::generate_handler![sync_changes])
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:glassypdm.db", migrations)
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
