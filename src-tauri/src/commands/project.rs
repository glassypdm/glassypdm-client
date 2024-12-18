use crate::{
    file::translate_filepath, types::RemoteFile, util::open_directory, dal::DataAccessLayer
};
use merkle_hash::{bytes_to_hex, Algorithm, MerkleTree};
use serde::{Deserialize, Serialize};
use sqlx::{Pool, Row, Sqlite};
use std::path::{Path, PathBuf};
use std::fs::{self, remove_dir_all};
use tauri::State;
use tokio::sync::Mutex;
use crate::types::LocalProject;


#[tauri::command]
pub async fn get_local_projects(
    state_mutex: State<'_, Mutex<Pool<Sqlite>>>,
) -> Result<Vec<LocalProject>, ()> {
    let pool = state_mutex.lock().await;
    let dal = DataAccessLayer::new(&pool);
    let server = dal.get_active_server().await.unwrap();

    let pid_query = sqlx::query("SELECT DISTINCT pid FROM file")
        .fetch_all(&*pool)
        .await;
    let mut output: Vec<LocalProject> = vec![];
    match pid_query {
        Ok(rows) => {
            for row in rows {
                let pid = row.get::<i32, &str>("pid");
                let query =
                    sqlx::query("SELECT title, team_name FROM project WHERE url = $1 AND pid = $2")
                        .bind(server.clone())
                        .bind(pid)
                        .fetch_one(&*pool)
                        .await;

                match query {
                    Ok(row) => output.push(LocalProject {
                        pid: pid,
                        title: row.get::<String, &str>("title").to_string(),
                        team_name: row.get::<String, &str>("team_name").to_string(),
                    }),
                    Err(err) => {
                        println!("error: {}", err);
                    }
                }
            }
        }
        Err(err) => {
            println!("error: {}", err);
        }
    }
    Ok(output)
}

#[tauri::command]
pub async fn open_project_dir(
    pid: i32,
    state_mutex: State<'_, Mutex<Pool<Sqlite>>>,
) -> Result<(), ()> {
    let pool = state_mutex.lock().await;
    let dal = DataAccessLayer::new(&pool);

    let project_dir = dal.get_project_dir(pid).await.unwrap();
    let _ = fs::create_dir_all(&project_dir);
    let mut pb = PathBuf::new();
    pb.push(project_dir);
    open_directory(pb);

    return Ok(());
}

#[tauri::command]
pub async fn clear_file_table(pid: i32, state_mutex: State<'_, Mutex<Pool<Sqlite>>>) -> Result<(), ()> {
    let pool = state_mutex.lock().await;
    let dal = DataAccessLayer::new(&pool);

    let _ = dal.clear_file_table_for_project(pid).await;
    return Ok(());
}

#[tauri::command]
pub async fn delete_project(pid: i32, state_mutex: State<'_, Mutex<Pool<Sqlite>>>) -> Result<(), String> {
    let pool = state_mutex.lock().await;
    let dal = DataAccessLayer::new(&pool);

    let _ = dal.clear_file_table_for_project(pid).await;

    // delete project folder
    let project_dir = dal.get_project_dir(pid).await.unwrap();
    match remove_dir_all(Path::new(&project_dir)) {
        Ok(_res) => {},
        Err(err) => {
            log::error!("could not delete the trash: {}", err);
        }
    }
  Ok(())
}