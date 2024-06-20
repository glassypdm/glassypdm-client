use serde::{Deserialize, Serialize};
use sqlx::{Pool, Sqlite, Row};
use tauri::{State};
use tokio::sync::Mutex;

use crate::util::get_current_server;

#[tauri::command]
pub async fn update_project_info(pid: i32, title: String, init_commit: i32, state_mutex: State<'_, Mutex<Pool<Sqlite>>>) -> Result<(), ()> {
    let pool = state_mutex.lock().await;
    let server = get_current_server(&pool).await.unwrap();

    let _output = sqlx::query("INSERT INTO project(pid, url, title, base_commitid, remote_title) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(pid, url) DO UPDATE SET remote_title = excluded.title")
        .bind(pid)
        .bind(server)
        .bind(title.clone())
        .bind(init_commit)
        .bind(title.clone())
        .execute(&*pool)
        .await;

    Ok(())
}

#[derive(sqlx::FromRow, Serialize, Deserialize)]
pub struct FileChange {
    filepath: String,
    size: u32,
    change_type: u32
}

#[tauri::command]
pub async fn get_uploads(pid: i32, state_mutex: State<'_, Mutex<Pool<Sqlite>>>) -> Result<Vec<FileChange>, ()> {
    let pool = state_mutex.lock().await;
    let server = get_current_server(&pool).await.unwrap();

    let output: Vec<FileChange> = sqlx::query_as("SELECT filepath, size, change_type FROM file WHERE pid = $1 AND change_type != 0")
    .bind(pid).fetch_all(&*pool)
    .await.unwrap();

    // TODO don't unwrap
    Ok(output)
}