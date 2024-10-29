use crate::{types::SettingsOptions, util::get_active_server};
use fs_extra::dir::{move_dir, CopyOptions};
use sqlx::{Pool, Row, Sqlite};
use tauri::State;
use tokio::sync::Mutex;

#[tauri::command]
pub async fn get_server_name(state_mutex: State<'_, Mutex<Pool<Sqlite>>>) -> Result<String, ()> {
    let pool = state_mutex.lock().await;
    let output = sqlx::query("SELECT name FROM server WHERE active = 1")
        .fetch_one(&*pool)
        .await;

    match output {
        Ok(row) => Ok(row.get::<String, &str>("name")),
        Err(err) => {
            println!("asdfasdf {}", err);
            Ok("glassyPDM".to_string())
        }
    }
}

#[tauri::command]
pub async fn get_server_url(state_mutex: State<'_, Mutex<Pool<Sqlite>>>) -> Result<String, ()> {
    let pool = state_mutex.lock().await;

    let output = sqlx::query("SELECT CASE WHEN debug_active = 1 THEN debug_url ELSE url END as url FROM server WHERE active = 1").fetch_one(&*pool).await;

    match output {
        Ok(row) => Ok(row.get::<String, &str>("url")),
        Err(err) => {
            println!("asdfasdf {}", err);
            Ok("".to_string())
        }
    }
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
    sqlx::query(
            "INSERT INTO server (url, clerk_publickey, local_dir, name, active, debug_url, debug_active) VALUES (?, ?, ?, ?, ?, ?, ?);"
    )
        .bind(url)
        .bind(clerk)
        .bind(local_dir)
        .bind(name)
        .bind(1)
        .bind("http://localhost:5000")
        .bind(0)
        .execute(&*pool)
        .await.unwrap();
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
    let old_server_dir = get_server_dir(&pool).await.unwrap();
    let _ = sqlx::query("UPDATE server SET local_dir = ? WHERE active = 1")
        .bind(dir.clone())
        .execute(&*pool)
        .await;

    if move_files {
        log::info!("moving files...");
        // TODO linux testing
        let options = CopyOptions::new();
        match move_dir(old_server_dir.clone(), parent_dir.clone(), &options) {
            Ok(_) => return Ok(true),
            Err(e) => {
                log::error!("encountered error moving files from {} to {}: {}", old_server_dir, parent_dir, e);
                return Ok(false);
            }
        }
    }
    let url = get_active_server(&pool).await.unwrap();
    if url == "" {
        log::warn!("could not obtain active server url");
        return Ok(false);
    }

    // clear file and project table
    let _ = sqlx::query("delete from project WHERE url = $1")
        .bind(url.clone())
        .execute(&*pool)
        .await;

    let _ = sqlx::query("delete from file")
        .execute(&*pool)
        .await;       
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
    let url = get_active_server(&pool).await.unwrap();

    match sqlx::query("UPDATE server SET cache_setting = $1 WHERE url = $2")
        .bind(if new_cache { 1 } else { 0 })
        .bind(url)
        .execute(&*pool)
        .await {
            Ok(_o) => {
                Ok(true)
            },
            Err(err) => {
                log::error!("could not set cache setting due to db error: {}", err);
                Ok(false)
            }
    }
}

pub async fn get_cache_setting(pool: &Pool<Sqlite>) -> Result<bool, ()> {
    let url = get_active_server(pool).await.unwrap();
    match sqlx::query("SELECT cache_setting FROM server WHERE url = $1")
        .bind(url)
        .fetch_one(pool)
        .await {
            Ok(row) => {
                let setting = row.get::<u32, &str>("cache_setting");
                Ok(if setting == 1 { true } else { false })
            },
            Err(err) => {
                log::error!("could not retrieve cache setting due to db error: {}", err);
                Ok(false)
            }
    }
}