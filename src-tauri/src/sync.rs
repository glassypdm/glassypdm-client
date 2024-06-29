use std::fs;
use serde::{Deserialize, Serialize};
use sqlx::{Pool, Sqlite};
use tauri::State;
use merkle_hash::{bytes_to_hex, Algorithm, MerkleTree};
use crate::util::{get_project_dir, get_current_server};
use std::path::PathBuf;
use tokio::sync::Mutex;

async fn hash_dir(pid: i32, dir_path: PathBuf, pool: &Pool<Sqlite>) {
    println!("start: {}", dir_path.display());

    let _ = sqlx::query("UPDATE file SET in_fs = 0 WHERE pid = $1").bind(pid).execute(&*pool).await;

    let tree = MerkleTree::builder(dir_path.display().to_string())
    .algorithm(Algorithm::Blake3)
    .hash_names(false)
    .build().unwrap();
    
    for file in tree {
        // uwu
        let rel_path = file.path.relative.into_string();
        let metadata = std::fs::metadata(file.path.absolute.clone()).unwrap();
        let hash = bytes_to_hex(file.hash);
        let filesize = metadata.len();
        // ignore folders
        if metadata.is_dir() {
            continue;
        }
        //println!("hash {}", hash);

        // ignore temp solidworks files
        if rel_path.contains("~$") {
            println!("solidworks temporary file detected {}", rel_path);
            continue;
        } // root directory is empty
        else if rel_path == "" {
            continue;
        }

        // write to sqlite
        let hehe = sqlx::query("INSERT INTO file(filepath, pid, curr_hash, size) VALUES($1, $2, $3, $4)
        ON CONFLICT(filepath, pid) DO UPDATE SET curr_hash = excluded.curr_hash, size = excluded.size, in_fs = 1")
        .bind(rel_path)
        .bind(pid)
        .bind(hash)
        .bind(filesize as i64)
        .execute(&*pool).await;
        match hehe {
            Ok(owo) => {},
            Err(err) =>{
                println!("error! {}", err);
            }
        }
    }

    // TODO verify the below logic
    let _ = sqlx::query(
        "UPDATE file SET change_type = 2 WHERE in_fs = 1 AND base_hash != curr_hash AND pid = $1 AND base_hash != ''"
    ).bind(pid).execute(pool).await;

    let _ = sqlx::query(
        "UPDATE file SET change_type = 3 WHERE in_fs = 0 AND pid = $1 AND base_hash != ''"
    ).bind(pid).execute(pool).await;

    // delete entries of files that are untracked and deleted
    let _ = sqlx::query(
        "DELETE FROM file WHERE in_fs = 0 AND pid = $1 AND base_hash = ''"
    ).bind(pid).execute(pool).await;

}

// precondition: we have a server_url
#[tauri::command]
pub async fn sync_changes(pid: i32, state_mutex: State<'_, Mutex<Pool<Sqlite>>>) -> Result<(), ()> {
    let pool = state_mutex.lock().await;
    let project_dir = get_project_dir(pid, &pool).await.unwrap();

    // create folder if it does not exist
    let _ = fs::create_dir_all(&project_dir);
    hash_dir(pid, project_dir.into(), &pool).await;
    println!("hashing done");

    // TODO get updated version of project
    // client should send server a filepath and the base commit
    // if there is a new version, server responds with chunk list and tracked commit
    // otherwise, response is up to date and tracked commit should be set equal to base commit
    Ok(())
}

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

    let output: Vec<FileChange> = sqlx::query_as("SELECT filepath, size, change_type FROM file WHERE pid = $1 AND change_type != 0")
    .bind(pid).fetch_all(&*pool)
    .await.unwrap();

    // TODO don't unwrap
    Ok(output)
}