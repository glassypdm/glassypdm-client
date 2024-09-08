use tauri::State;
use tokio::sync::Mutex;
use sqlx::{Row, Pool, Sqlite};
use crate::{types::SettingsOptions, util::get_active_server};

#[tauri::command]
pub async fn get_server_name(state_mutex: State<'_, Mutex<Pool<Sqlite>>>) -> Result<String, ()> {
    let pool = state_mutex.lock().await;
    let output = sqlx::query("SELECT name FROM server WHERE active = 1").fetch_one(&*pool).await;

    match output {
        Ok(row) => {
        Ok(row.get::<String, &str>("name"))
        },
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
        Ok(row) => {
            Ok(row.get::<String, &str>("url"))
        },
        Err(err) => {
            println!("asdfasdf {}", err);
            Ok("".to_string())
        }
    }
}

#[tauri::command]
pub async fn set_debug(debug: i32, state_mutex: State<'_, Mutex<Pool<Sqlite>>>) -> Result<(), ()> {
    let pool = state_mutex.lock().await;

    let _ = sqlx::query(
        "UPDATE server SET debug_active = ? WHERE active = 1"
    )
        .bind(debug)
        .execute(&*pool).await;

    Ok(())
}

#[tauri::command]
pub async fn get_server_clerk(state_mutex: State<'_, Mutex<Pool<Sqlite>>>) -> Result<String, ()> {
    let pool = state_mutex.lock().await;
    let output = sqlx::query("SELECT clerk_publickey FROM server WHERE active = 1").fetch_one(&*pool).await;
    match output {
        Ok(row) => {
            Ok(row.get::<String, &str>("clerk_publickey"))
        },
        Err(err) => {
            println!("ooga booga {}", err);
            Ok("".to_string())
        }
    }
}

pub async fn get_server_dir(pool: &Pool<Sqlite>) -> Result<String, ()> {
    let output = sqlx::query("SELECT local_dir FROM server WHERE active = 1").fetch_one(&*pool).await;
    match output {
        Ok(row) => {
            Ok(row.get::<String, &str>("local_dir"))
        },
        Err(err) => {
            println!("dir not found {}", err);
            Ok("".to_string())
        }
    }
}

#[tauri::command]
pub async fn add_server(url: String, clerk: String, local_dir: String, name: String, state_mutex: State<'_, Mutex<Pool<Sqlite>>>) -> Result<bool, ()> {
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
pub async fn init_settings_options(state_mutex: State<'_, Mutex<Pool<Sqlite>>>) -> Result<SettingsOptions, ()> {
    let pool = state_mutex.lock().await;

    let output = sqlx::query(
        "SELECT local_dir, debug_active FROM server WHERE active = 1"
    ).fetch_one(&*pool).await;

    match output {
        Ok(row) => {
            let result = SettingsOptions {
                local_dir: row.get::<String, &str>("local_dir").to_string(),
                debug_active: row.get::<i32, &str>("debug_active")
            };
            Ok(result)
        },
        Err(_err) => {
            // TODO do something with error, and handle this case better lol
            Ok(SettingsOptions {
                local_dir: "".to_string(),
                debug_active: 0
            })
        }
    }
}

#[tauri::command]
pub async fn set_local_dir(dir: String, state_mutex: State<'_, Mutex<Pool<Sqlite>>>) -> Result<(), ()> {
    let pool = state_mutex.lock().await;
    
    let _ = sqlx::query(
        "UPDATE server SET local_dir = ? WHERE active = 1"
    )
        .bind(dir)
        .execute(&*pool).await;

    // TODO error handling
    let url = get_active_server(&pool).await.unwrap();

    // clear file and project table
    let _ = sqlx::query(
        "delete from project WHERE url = $1"
    )
        .bind(url.clone())
        .execute(&*pool).await;

    let _ = sqlx::query(
        "delete from file WHERE url = $1"
    )
        .bind(url)
        .execute(&*pool).await;

    Ok(())
}