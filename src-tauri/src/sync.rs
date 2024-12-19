use crate::{
    file::translate_filepath, types::RemoteFile, util::open_directory, dal::DataAccessLayer
};
use merkle_hash::{bytes_to_hex, Algorithm, MerkleTree};
use serde::{Deserialize, Serialize};
use sqlx::{Pool, Row, Sqlite};
use std::path::PathBuf;
use std::fs;
use tauri::State;
use tokio::sync::Mutex;

pub async fn hash_dir(pid: i32, dir_path: PathBuf, pool: &Pool<Sqlite>) {
    log::info!("starting hashing directory");
    log::info!("directory: {}", dir_path.display());
    let dal = DataAccessLayer::new(pool);

    let _ = dal.reset_fs_state(pid).await;

    let tree = MerkleTree::builder(dir_path.display().to_string())
        .algorithm(Algorithm::Blake3)
        .hash_names(false)
        .build()
        .unwrap();

    log::info!("merkle tree created");

    for file in tree {
        // store paths as 'windows' paths
        let rel_path;
        #[cfg(target_os = "windows")]
        {
            rel_path = file.path.relative.into_string();
        }
        #[cfg(target_os = "linux")]
        {
            rel_path = translate_filepath(&(file.path.relative.into_string()), false);
        }
        let metadata = std::fs::metadata(file.path.absolute.clone()).unwrap();
        let hash = bytes_to_hex(file.hash);
        let filesize = metadata.len();
        // ignore folders
        if metadata.is_dir() {
            continue;
        }

        // ignore temp solidworks files
        if rel_path.contains("~$") {
            continue;
        }
        // root directory is empty
        else if rel_path == "" {
            continue;
        }

        if filesize == 0 {
            //log::trace!("skiping empty file");
            continue;
        }

        // write to sqlite
        let _ = dal.insert_local_file(rel_path, pid, hash, filesize).await;
    }
    log::info!("files parsed");
    let _ = dal.update_change_types(pid).await;

    log::info!("hashing directory complete");
}

// precondition: we have a server_url
#[tauri::command]
pub async fn sync_changes(
    pid: i32,
    remote: Vec<RemoteFile>,
    state_mutex: State<'_, Mutex<Pool<Sqlite>>>,
) -> Result<bool, ()> {
    log::info!("syncing changes for project {}", pid);

    let pool = state_mutex.lock().await;
    let dal = DataAccessLayer::new(&pool);
    let project_dir = dal.get_project_dir(pid).await.unwrap();

    // create folder if it does not exist
    let _ = fs::create_dir_all(&project_dir);

    // hash local files
    hash_dir(pid, project_dir.into(), &pool).await;

    log::info!("updating db with remote files...");
    // update table with remote files
    for file in remote {
        // write to sqlite
        // TODO check result
        let _ = dal.insert_remote_file(file.path, pid, file.commitid, file.filehash, file.changetype, file.blocksize).await;
    }
    log::info!("remote files updated");
    // TODO update last_synced in project table
    Ok(true)
}

#[tauri::command]
pub async fn update_project_info(
    pid: i32,
    title: String,
    team_name: String,
    init_commit: i32,
    state_mutex: State<'_, Mutex<Pool<Sqlite>>>,
) -> Result<(), ()> {
    let pool = state_mutex.lock().await;
    let dal = DataAccessLayer::new(&pool);
    let _ = dal.add_project(pid, title, team_name, init_commit).await;

    Ok(())
}

#[derive(sqlx::FromRow, Serialize, Deserialize, Clone)]
pub struct FileChange {
    pub filepath: String,
    pub size: u32,
    pub change_type: u32,
    pub hash: String,
    pub commit_id: i32,
}

#[tauri::command]
pub async fn get_uploads(
    pid: i32,
    state_mutex: State<'_, Mutex<Pool<Sqlite>>>,
) -> Result<Vec<FileChange>, ()> {
    log::info!("querying db for uploads");
    let pool = state_mutex.lock().await;
    let dal = DataAccessLayer::new(&pool);
    let output: Vec<FileChange> = dal.get_uploads(pid).await.unwrap();
    log::info!("finished querying db for uploads");
    Ok(output)
}

#[tauri::command]
pub async fn get_downloads(
    pid: i32,
    state_mutex: State<'_, Mutex<Pool<Sqlite>>>,
) -> Result<Vec<FileChange>, ()> {
    log::info!("querying db for downloads");
    let pool = state_mutex.lock().await;
    let dal = DataAccessLayer::new(&pool);
    let output = dal.get_downloads(pid).await.unwrap();

    log::info!("finished querying db for downloads");
    Ok(output)
}

#[tauri::command]
pub async fn get_conflicts(
    pid: i32,
    state_mutex: State<'_, Mutex<Pool<Sqlite>>>,
) -> Result<Vec<FileChange>, ()> {
    log::info!("querying db for file conflicts in project {}", pid);
    let pool = state_mutex.lock().await;
    let dal = DataAccessLayer::new(&pool);

    let output: Vec<FileChange> = dal.get_conflicts(pid).await.unwrap();
    log::info!(
        "found {} conflicting files for project {}",
        output.len(),
        pid
    );
    Ok(output)
}

#[tauri::command]
pub async fn get_project_name(
    pid: i32,
    state_mutex: State<'_, Mutex<Pool<Sqlite>>>,
) -> Result<String, ()> {
    let pool = state_mutex.lock().await;
    let dal = DataAccessLayer::new(&pool);
    dal.get_project_name(pid).await
}