use std::fs;
use sqlx::{Pool, Sqlite, Row};
use tauri::State;
use crate::{types::RemoteFile, util::{get_current_server, get_project_dir}};
use std::path::PathBuf;
use tokio::sync::Mutex;

#[tauri::command]
pub async fn delete_file(pid: i32, rel_path: String, state_mutex: State<'_, Mutex<Pool<Sqlite>>>) -> Result<bool, ()> {
    let pool = state_mutex.lock().await;
    let project_dir = get_project_dir(pid, &pool).await.unwrap();

    let path = project_dir + &rel_path;
    let _ = fs::remove_file(path);
    Ok(true)
}