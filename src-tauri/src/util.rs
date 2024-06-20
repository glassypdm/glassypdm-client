use std::{ffi::OsStr, path::{Path, PathBuf}};

use sqlx::{Pool, Sqlite, Row};

pub async fn get_current_server(pool: &Pool<Sqlite>) -> Result<String, ()> {
    let output = sqlx::query("SELECT CASE WHEN debug_active = 1 THEN debug_url ELSE url END as url FROM server WHERE active = 1").fetch_one(&*pool).await;

    match output {
        Ok(row) => {
            Ok(row.get::<String, &str>("url"))
        },
        Err(err) => {
            println!("asdfasdf {}", err); // TODO ???
            Ok("".to_string())
        }
    }
}

pub async fn get_project_dir(pid: i32, pool: &Pool<Sqlite>) -> Result<String, ()> {
    let server = get_current_server(pool).await.unwrap();
    let output = sqlx::query("SELECT server.local_dir, project.title FROM server, project WHERE server.active = 1 AND project.url = ? AND project.pid = ?")
        .bind(server)
        .bind(pid)
        .fetch_one(pool)
        .await;
    match output {
        Ok(row) => {
            println!("query ok");
            let output = Path::new(&row.get::<String, &str>("local_dir")).join(row.get::<String, &str>("title"));
            println!("output");
            Ok(output.display().to_string())
        },
        Err(err) => {
            println!("asdfasdf {}", err);
            Ok("".to_string())
        }
    }
}