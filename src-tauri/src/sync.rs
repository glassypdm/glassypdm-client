use crate::{
    types::RemoteFile,
    util::{get_active_server, get_project_dir},
};
use merkle_hash::{bytes_to_hex, Algorithm, MerkleTree};
use serde::{Deserialize, Serialize};
use sqlx::{Pool, Row, Sqlite};
use std::path::PathBuf;
use std::{fs, process::Command};
use tauri::State;
use tokio::sync::Mutex;

pub async fn hash_dir(pid: i32, dir_path: PathBuf, pool: &Pool<Sqlite>) {
    println!("start: {}", dir_path.display());

    let _ = sqlx::query("UPDATE file SET in_fs = 0 WHERE pid = $1")
        .bind(pid)
        .execute(&*pool)
        .await;

    let tree = MerkleTree::builder(dir_path.display().to_string())
        .algorithm(Algorithm::Blake3)
        .hash_names(false)
        .build()
        .unwrap();

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
            //println!("solidworks temporary file detected {}", rel_path);
            continue;
        }
        // root directory is empty
        else if rel_path == "" {
            continue;
        }

        if filesize == 0 {
            println!("empty file found");
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
            Ok(_owo) => {}
            Err(err) => {
                println!("error! {}", err);
            }
        }
    }

    // no change - file was un-deleted (e.g., recovered from user's recycle bin)
    let _ = sqlx::query(
        "UPDATE file SET change_type = 0 WHERE in_fs = 1 AND change_type = 3 AND pid = $1",
    )
    .bind(pid)
    .execute(pool)
    .await;

    // no change - file was reset
    let _ = sqlx::query(
        "UPDATE file SET change_type = 0 WHERE in_fs = 1 AND base_hash == curr_hash AND pid = $1",
    )
    .bind(pid)
    .execute(pool)
    .await;

    // updated file - base hash is different from current hash, and file is tracked, i.e. base hash not empty
    let _ = sqlx::query(
        "UPDATE file SET change_type = 2 WHERE in_fs = 1 AND base_hash != curr_hash AND pid = $1 AND base_hash != ''"
    ).bind(pid).execute(pool).await;

    // new file - base hash is different from current hash and file is untracked, i.e. base hash is empty
    let _ = sqlx::query(
        "UPDATE file SET change_type = 1 WHERE in_fs = 1 AND base_hash != curr_hash AND pid = $1 AND base_hash == ''"
    ).bind(pid).execute(pool).await;

    // deleted file - file is tracked, i.e. base hash not empty and file wasn't found in folder
    let _ = sqlx::query(
        "UPDATE file SET change_type = 3 WHERE in_fs = 0 AND pid = $1 AND base_hash != ''",
    )
    .bind(pid)
    .execute(pool)
    .await;

    // delete entries of files that are untracked and deleted
    let _ = sqlx::query("DELETE FROM file WHERE in_fs = 0 AND pid = $1 AND base_hash = ''")
        .bind(pid)
        .execute(pool)
        .await;
}

// :clown:
#[tauri::command]
pub async fn open_project_dir(
    pid: i32,
    state_mutex: State<'_, Mutex<Pool<Sqlite>>>,
) -> Result<(), ()> {
    let pool = state_mutex.lock().await;
    let project_dir = get_project_dir(pid, &pool).await.unwrap();
    let _ = fs::create_dir_all(&project_dir);

    // TODO windows only
    Command::new("explorer").arg(project_dir).spawn().unwrap();

    return Ok(());
}
// precondition: we have a server_url
#[tauri::command]
pub async fn sync_changes(
    pid: i32,
    remote: Vec<RemoteFile>,
    state_mutex: State<'_, Mutex<Pool<Sqlite>>>,
) -> Result<bool, ()> {
    let pool = state_mutex.lock().await;
    let project_dir = get_project_dir(pid, &pool).await.unwrap();

    // create folder if it does not exist
    let _ = fs::create_dir_all(&project_dir);

    // hash local files
    hash_dir(pid, project_dir.into(), &pool).await;
    println!("hashing done");

    // update table with remote files
    for file in remote {
        // write to sqlite
        let hehe = sqlx::query("INSERT INTO file(filepath, pid, tracked_commitid, tracked_hash, tracked_changetype, in_fs, change_type, tracked_size)
            VALUES($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT(filepath, pid) DO UPDATE SET
            tracked_commitid = excluded.tracked_commitid,
            tracked_hash = excluded.tracked_hash,
            tracked_changetype = CASE WHEN base_hash != '' OR excluded.tracked_changetype == 3 THEN excluded.tracked_changetype ELSE 1 END,
            tracked_size = excluded.tracked_size")
        .bind(file.path)
        .bind(pid)
        .bind(file.commitid)
        .bind(file.filehash)
        .bind(if file.changetype == 3 { 3 } else { 1 })
        .bind(0)
        .bind(0)
        .bind(file.blocksize)
        .execute(&*pool).await;
        match hehe {
            Ok(_owo) => {}
            Err(err) => {
                println!("error! {}", err);
            }
        }
    }

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
    let server = get_active_server(&pool).await.unwrap();

    let _output = sqlx::query("INSERT INTO project(pid, url, title, team_name, base_commitid, remote_title) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(pid, url) DO UPDATE SET remote_title = excluded.title")
        .bind(pid)
        .bind(server)
        .bind(title.clone())
        .bind(team_name)
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
    change_type: u32,
    hash: String,
    commit_id: i32,
}

#[tauri::command]
pub async fn get_uploads(
    pid: i32,
    state_mutex: State<'_, Mutex<Pool<Sqlite>>>,
) -> Result<Vec<FileChange>, ()> {
    let pool = state_mutex.lock().await;

    let output: Vec<FileChange> = match sqlx::query_as("SELECT filepath, size, change_type, curr_hash as hash, base_commitid as commit_id FROM file WHERE pid = $1 AND change_type != 0")
    .bind(pid).fetch_all(&*pool)
    .await {
        Ok(uploads) => uploads,
        Err(err) => {
            println!("get_uploads had error querying db: {}", err);
            Vec::<FileChange>::new()
        }
    };

    Ok(output)
}

#[tauri::command]
pub async fn get_downloads(
    pid: i32,
    state_mutex: State<'_, Mutex<Pool<Sqlite>>>,
) -> Result<Vec<FileChange>, ()> {
    let pool = state_mutex.lock().await;

    let output: Vec<FileChange> = match sqlx::query_as(
        "SELECT filepath, tracked_size as size, tracked_changetype as change_type, tracked_hash as hash, tracked_commitid as commit_id FROM file WHERE pid = $1 AND
        (
            (base_hash != tracked_hash AND base_hash != '' AND tracked_changetype = 3) OR
            (base_hash != tracked_hash AND tracked_changetype != 3)
        )
        "
    )
    .bind(pid).fetch_all(&*pool)
    .await {
        Ok(downloads) => downloads,
        Err(err) => {
            println!("get_downloads had error querying db: {}", err);
            Vec::<FileChange>::new()
        }
    };

    Ok(output)
}

#[tauri::command]
pub async fn get_conflicts(
    pid: i32,
    state_mutex: State<'_, Mutex<Pool<Sqlite>>>,
) -> Result<Vec<FileChange>, ()> {
    let pool = state_mutex.lock().await;

    let output: Vec<FileChange> = match sqlx::query_as(
// commented out: old conflict detection
// current logic: get_uploads \cap get_downloads
//        "SELECT filepath, size, change_type, curr_hash as hash, base_commitid as commit_id FROM file WHERE pid = $1 AND
//        tracked_hash != curr_hash AND curr_hash != '' AND tracked_hash != base_hash"
        "SELECT filepath, size, change_type, curr_hash as hash, base_commitid as commit_id FROM file WHERE pid = $1 AND
        change_type != 0 AND
        (
            (base_hash != tracked_hash AND base_hash != '' AND tracked_changetype = 3) OR
            (base_hash != tracked_hash AND tracked_changetype != 3)
        )
        "
    )
    .bind(pid).fetch_all(&*pool)
    .await {
        Ok(conflicts) => conflicts,
        Err(err) => {
            println!("get_conflicts had error querying db: {}", err);
            Vec::<FileChange>::new()
        }
    };

    Ok(output)
}

#[tauri::command]
pub async fn get_project_name(
    pid: i32,
    state_mutex: State<'_, Mutex<Pool<Sqlite>>>,
) -> Result<String, ()> {
    let pool = state_mutex.lock().await;
    let server = get_active_server(&pool).await.unwrap();
    let output = sqlx::query("SELECT title FROM project WHERE pid = $1 AND url = $2")
        .bind(pid)
        .bind(server)
        .fetch_one(&*pool)
        .await;

    match output {
        Ok(row) => Ok(row.get::<String, &str>("title")),
        Err(err) => {
            println!("Error retrieving project name: {}", err);
            Ok("".to_string())
        }
    }
}

#[derive(Serialize, Deserialize)]
pub struct LocalProject {
    pid: i32,
    title: String,
    team_name: String,
}

#[tauri::command]
pub async fn get_local_projects(
    state_mutex: State<'_, Mutex<Pool<Sqlite>>>,
) -> Result<Vec<LocalProject>, ()> {
    let pool = state_mutex.lock().await;
    let server = get_active_server(&pool).await.unwrap();

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
