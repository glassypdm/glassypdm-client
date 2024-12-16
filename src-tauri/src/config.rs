use crate::{dal::DataAccessLayer, types::SettingsOptions};
use fs_extra::dir::{move_dir, CopyOptions};
use sqlx::{Pool, Row, Sqlite};
use tauri::State;
use tokio::sync::Mutex;

#[tauri::command]
pub async fn get_server_name(state_mutex: State<'_, Mutex<Pool<Sqlite>>>) -> Result<String, ()> {
    let pool = state_mutex.lock().await;
    let dal = DataAccessLayer::new(&pool);

    dal.get_server_name().await
}

#[tauri::command]
pub async fn get_server_url(state_mutex: State<'_, Mutex<Pool<Sqlite>>>) -> Result<String, ()> {
    let pool = state_mutex.lock().await;
    let dal = DataAccessLayer::new(&pool);

    dal.get_current_server().await
}

#[tauri::command]
pub async fn set_debug(debug: i32, state_mutex: State<'_, Mutex<Pool<Sqlite>>>) -> Result<(), ()> {
    let pool = state_mutex.lock().await;

    let _ = sqlx::query("UPDATE server SET debug_active = ? WHERE active = 1")
        .bind(debug)
        .execute(&*pool)
        .await;

    Ok(())
}

#[tauri::command]
pub async fn get_server_clerk(state_mutex: State<'_, Mutex<Pool<Sqlite>>>) -> Result<String, ()> {
    let pool = state_mutex.lock().await;
    let output = sqlx::query("SELECT clerk_publickey FROM server WHERE active = 1")
        .fetch_one(&*pool)
        .await;
    match output {
        Ok(row) => Ok(row.get::<String, &str>("clerk_publickey")),
        Err(err) => {
            println!("ooga booga {}", err);
            Ok("".to_string())
        }
    }
}

pub async fn get_server_dir(pool: &Pool<Sqlite>) -> Result<String, ()> {
    let output = sqlx::query("SELECT local_dir FROM server WHERE active = 1")
        .fetch_one(&*pool)
        .await;
    match output {
        Ok(row) => Ok(row.get::<String, &str>("local_dir")),
        Err(err) => {
            println!("dir not found {}", err);
            Ok("".to_string())
        }
    }
}

#[tauri::command]
pub async fn add_server(
    url: String,
    clerk: String,
    local_dir: String,
    name: String,
    state_mutex: State<'_, Mutex<Pool<Sqlite>>>,
) -> Result<bool, ()> {
    let pool = state_mutex.lock().await;
    let dal = DataAccessLayer::new(&pool);
    let _ = dal.add_server(url, clerk, local_dir, name).await;
    Ok(true)
}

#[tauri::command]
pub async fn init_settings_options(
    state_mutex: State<'_, Mutex<Pool<Sqlite>>>,
) -> Result<SettingsOptions, ()> {
    let pool = state_mutex.lock().await;

    let output = sqlx::query("SELECT local_dir, debug_active FROM server WHERE active = 1")
        .fetch_one(&*pool)
        .await;

    match output {
        Ok(row) => {
            let result = SettingsOptions {
                local_dir: row.get::<String, &str>("local_dir").to_string(),
                debug_active: row.get::<i32, &str>("debug_active"),
            };
            Ok(result)
        }
        Err(_err) => {
            // TODO do something with error, and handle this case better lol
            Ok(SettingsOptions {
                local_dir: "".to_string(),
                debug_active: 0,
            })
        }
    }
}

#[tauri::command]
pub async fn set_local_dir(
    parent_dir: String,
    dir: String,
    move_files: bool,
    state_mutex: State<'_, Mutex<Pool<Sqlite>>>,
) -> Result<bool, ()> {
    log::info!("setting local directory to {}", dir);
    log::info!("parent dir: {}", parent_dir);
    let pool = state_mutex.lock().await;
    let dal = DataAccessLayer::new(&pool);
    let old_server_dir = get_server_dir(&pool).await.unwrap();
    let _ = sqlx::query("UPDATE server SET local_dir = ? WHERE active = 1")
        .bind(dir.clone())
        .execute(&*pool)
        .await;

    if move_files {
        log::info!("moving files...");
        // TODO linux testing + support
        let options = CopyOptions::new();
        match move_dir(old_server_dir.clone(), parent_dir.clone(), &options) {
            Ok(_) => return Ok(true),
            Err(e) => {
                log::error!("encountered error moving files from {} to {}: {}", old_server_dir, parent_dir, e);
                return Ok(false);
            }
        }
    }

    let url = dal.get_active_server().await.unwrap();
    if url == "" {
        log::warn!("could not obtain active server url");
        return Ok(false);
    }

    // clear file and project table
    let _ = dal.clear_project_table(url).await;
    let _ = dal.clear_file_table().await;    
    Ok(true)
}

#[tauri::command]
pub async fn cmd_get_cache_setting(state_mutex: State<'_, Mutex<Pool<Sqlite>>>) -> Result<bool, ()> {
    let pool = state_mutex.lock().await;
    return get_cache_setting(&pool).await;
}

#[tauri::command]
pub async fn cmd_set_cache_setting(new_cache: bool, state_mutex: State<'_, Mutex<Pool<Sqlite>>>) -> Result<bool, ()> {
    let pool = state_mutex.lock().await;
    let dal = DataAccessLayer::new(&pool);

    dal.update_cache_setting(new_cache).await
}

pub async fn get_cache_setting(pool: &Pool<Sqlite>) -> Result<bool, ()> {
    let dal = DataAccessLayer::new(pool);
    dal.get_cache_setting().await
}

#[tauri::command]
pub fn is_dev_mode() -> bool {
    return tauri::is_dev();
}