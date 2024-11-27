use std::process::Command;
use fs_extra::dir::get_size;
use log::error;
use tokio::sync::Mutex;
use tauri::{Manager, State};
use sqlx::{Pool, Row, Sqlite};
use std::fs::{self, create_dir_all, remove_dir_all, File};
use merkle_hash::{bytes_to_hex, Algorithm, MerkleTree};
use std::io::Read;
use std::path::{Path, PathBuf};
use std::result::Result::Ok;
use std::alloc;
use cap::Cap;
use crate::get_server_dir;
use crate::types::{ChangeType, UpdatedFile};

pub async fn get_current_server(pool: &Pool<Sqlite>) -> Result<String, ()> {
    let output = sqlx::query("SELECT CASE WHEN debug_active = 1 THEN debug_url ELSE url END as url FROM server WHERE active = 1").fetch_one(&*pool).await;

    match output {
        Ok(row) => Ok(row.get::<String, &str>("url")),
        Err(err) => {
            log::error!("couldn't get the current server url: {}", err);
            Ok("".to_string())
        }
    }
}

pub async fn get_active_server(pool: &Pool<Sqlite>) -> Result<String, ()> {
    let output = sqlx::query("SELECT url FROM server WHERE active = 1")
        .fetch_one(&*pool)
        .await;

    match output {
        Ok(row) => Ok(row.get::<String, &str>("url")),
        Err(err) => {
            log::error!("couldn't get the active server url: {}", err);
            Ok("".to_string())
        }
    }
}

pub async fn get_project_dir(pid: i32, pool: &Pool<Sqlite>) -> Result<String, ()> {
    println!("current allocating {}B", get_allocated());
    let server = get_active_server(pool).await.unwrap();
    let db_call = sqlx::query("SELECT server.local_dir, project.title, project.team_name FROM server, project WHERE server.active = 1 AND project.url = ? AND project.pid = ?")
        .bind(server)
        .bind(pid)
        .fetch_one(pool)
        .await;
    match db_call {
        Ok(row) => {
            let output = Path::new(&row.get::<String, &str>("local_dir"))
                .join(row.get::<String, &str>("team_name"))
                .join(row.get::<String, &str>("title"));
            Ok(output.display().to_string())
        }
        Err(err) => {
            log::error!("couldn't get the project directory for pid {}: {}", pid, err);
            Ok("".to_string())
        }
    }
}

pub async fn get_file_info(pid: i32, path: String, pool: &Pool<Sqlite>) -> Result<UpdatedFile, ()> {
    let output = sqlx::query(
        "SELECT curr_hash, size, change_type, in_fs FROM file WHERE filepath = $1 AND pid = $2",
    )
    .bind(path.clone())
    .bind(pid)
    .fetch_one(&*pool)
    .await;

    match output {
        Ok(row) => {
            let change = match row.get::<i32, &str>("change_type") {
                1 => ChangeType::Create,
                2 => ChangeType::Update,
                3 => ChangeType::Delete,
                _ => ChangeType::NoChange,
            };
            let in_fs = if row.get::<i32, &str>("in_fs") > 0 { true } else { false };
            let owo: UpdatedFile = UpdatedFile {
                path: path,
                hash: row.get::<String, &str>("curr_hash").to_string(),
                size: row.get::<i64, &str>("size"),
                change: change,
                in_fs: in_fs
            };

            Ok(owo)
        }
        Err(err) => {
            log::error!("couldn't get the file information for {} in project {}: {}", path, pid, err);
            Err(())
        }
    }
}

pub async fn get_cache_dir(pool: &Pool<Sqlite>) -> Result<String, ()> {
    let server_dir = get_server_dir(pool).await;
    match server_dir {
        Ok(dir) => {
            // TODO change \\ to os agnostic
            let output = dir + "\\" + ".glassycache";
            Ok(output)
        }
        Err(_err) => {
            log::error!("could not retrieve cache directory");
            Ok("".to_string())
        }
    }
}

pub async fn get_trash_dir(pool: &Pool<Sqlite>) -> Result<String, ()> {
    let server_dir = get_server_dir(pool).await;
    match server_dir {
        Ok(dir) => {
            // TODO change \\ to os agnostic
            let output = dir + "\\" + ".glassytrash";
            create_dir_all(output.clone()).unwrap();
            Ok(output)
        }
        Err(_err) => {
            log::error!("could not retrieve trash directory");
            Ok("".to_string())
        }
    }
}

pub async fn get_basehash(pid: i32, path: String, pool: &Pool<Sqlite>) -> Result<String, ()> {
    let result = sqlx::query(
        "SELECT base_hash FROM file WHERE
        pid = $1 AND filepath = $2 LIMIT 1
        ",
    )
    .bind(pid)
    .bind(path)
    .fetch_one(pool)
    .await;

    match result {
        Ok(row) => Ok(row.get::<String, &str>("base_hash")),
        Err(err) => {
            log::error!("could not get base_hash: {}", err);
            Err(())
        }
    }
}

// clear trash bin
pub async fn delete_trash(pool: &Pool<Sqlite>) -> Result<bool, ()> {
    let trash_dir = get_trash_dir(pool).await.unwrap();
    match remove_dir_all(Path::new(&trash_dir)) {
        Ok(_res) => Ok(true),
        Err(err) => {
            log::error!("could not delete the trash: {}", err);
            Ok(false)
        }
    }
}

// clear cache
#[tauri::command]
pub async fn cmd_delete_cache(state_mutex: State<'_, Mutex<Pool<Sqlite>>>) -> Result<bool, ()> {
    let pool = state_mutex.lock().await;
    return delete_cache(&pool).await;
}

pub async fn delete_cache(pool: &Pool<Sqlite>) -> Result<bool, ()> {
    log::info!("deleting the cache...");
    let cache_dir = get_cache_dir(pool).await.unwrap();
    match remove_dir_all(Path::new(&cache_dir)) {
        Ok(_res) => {
            log::info!("cache successfully deleted");
            Ok(true)
        },
        Err(err) => {
            log::error!("could not delete the cache: {}", err);
            Ok(false)
        }
    }
}

#[tauri::command]
pub async fn get_cache_size(state_mutex: State<'_, Mutex<Pool<Sqlite>>>) -> Result<u64, ()> {
    let pool = state_mutex.lock().await;
    let cache_dir = get_cache_dir(&pool).await.unwrap();

    if !Path::new(cache_dir.as_str()).exists() {
        return Ok(0);
    }
    
    let size = match get_size(cache_dir) {
        Ok(s) => s,
        Err(err) => {
            log::warn!("error while getting cache size: {}", err);
            0
        }
    };

    Ok(size)
}

#[tauri::command]
pub fn open_log_dir(app: tauri::AppHandle) -> Result<bool, ()> {
    let hehe = app.path().app_log_dir();
    match hehe {
        Ok(pb) => {
            open_directory(pb);
            Ok(true)
        },
        Err(err) => {
            log::warn!("Couldn't resolve app log directory: {}", err);
            Ok(false)
        }
    }
}

#[tauri::command]
pub fn open_app_data_dir(app: tauri::AppHandle) -> Result<bool, ()> {
    let hehe = app.path().app_data_dir();
    match hehe {
        Ok(pb) => {
            open_directory(pb);
            Ok(true)
        },
        Err(err) => {
            log::warn!("Couldn't resolve app log directory: {}", err);
            Ok(false)
        }
    }
}

pub fn open_directory(pb: PathBuf) -> bool {
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer").arg(pb).spawn().unwrap();
    }

    #[cfg(target_os = "linux")]
    {
        log::warn!("linux open directory not implemented!")
        // TODO
    }
    return true;
}

#[global_allocator]
static ALLOCATOR: Cap<alloc::System> = Cap::new(alloc::System, usize::max_value());

pub fn get_allocated() -> usize {
    ALLOCATOR.allocated()
}

pub async fn verify_file(rel_path: &String, pid: i32, pool: &Pool<Sqlite>) -> Result<bool, ()> {
    let project_dir = get_project_dir(pid, pool).await.unwrap();
    let absolute_path = project_dir + "\\" + rel_path; // TODO linux support
    let abs_path = Path::new(&absolute_path);
    // get current file info
    let file_info = get_file_info(pid, rel_path.to_string(), pool).await.unwrap();

    // check file existence before any sort of hashing
    if !abs_path.exists() && !file_info.in_fs {
        // valid
        return Ok(true);
    } else if (!abs_path.exists() && file_info.in_fs) || (abs_path.exists() && !file_info.in_fs)  {
        // invalid
        error!("path {} does not match up: current {}, stored {}", rel_path, abs_path.exists(), file_info.in_fs);
        return Ok(false);
    }


    let tree = MerkleTree::builder(&absolute_path)
        .algorithm(Algorithm::Blake3)
        .hash_names(false)
        .build().unwrap();

    let curr_hash = bytes_to_hex(tree.root.item.hash);
    //let metadata = std::fs::metadata(&absolute_path).unwrap();

    if file_info.hash != curr_hash {
        error!("path {} does not match: current {}, stored {}", rel_path, curr_hash, file_info.hash);
        return Ok(false)
    }
    Ok(true)
}