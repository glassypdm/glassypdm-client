use std::io::Read;
use std::fs::{self, create_dir_all, remove_dir_all, File};
use std::path::Path;
use std::result::Result::Ok;
use sqlx::{Pool, Sqlite, Row};

use crate::get_server_dir;
use crate::types::{ChangeType, UpdatedFile};

pub async fn get_current_server(pool: &Pool<Sqlite>) -> Result<String, ()> {
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

pub async fn get_active_server(pool: &Pool<Sqlite>) -> Result<String, ()> {
    let output = sqlx::query("SELECT url FROM server WHERE active = 1").fetch_one(&*pool).await;

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

pub async fn get_project_dir(pid: i32, pool: &Pool<Sqlite>) -> Result<String, ()> {
    let server = get_active_server(pool).await.unwrap();
    let db_call = sqlx::query("SELECT server.local_dir, project.title, project.team_name FROM server, project WHERE server.active = 1 AND project.url = ? AND project.pid = ?")
        .bind(server)
        .bind(pid)
        .fetch_one(pool)
        .await;
    match db_call {
        Ok(row) => {
            println!("query ok");
            let output = Path::new(&row.get::<String, &str>("local_dir"))
                .join(row.get::<String, &str>("team_name"))
                .join(row.get::<String, &str>("title"));
            println!("output");
            Ok(output.display().to_string())
        },
        Err(err) => {
            println!("asdfasdf {}", err);
            Ok("".to_string())
        }
    }
}

pub async fn get_file_info(pid: i32, path: String, pool: &Pool<Sqlite>) -> Result<UpdatedFile, ()> {
    let output = sqlx::query("SELECT curr_hash, size, change_type FROM file WHERE filepath = $1 AND pid = $2")
        .bind(path.clone())
        .bind(pid)
        .fetch_one(&*pool).await;

    match output {
        Ok(row) => {
            let change = match row.get::<i32, &str>("change_type") {
                1 => ChangeType::Create,
                2 => ChangeType::Update,
                3 => ChangeType::Delete,
                _ => ChangeType::NoChange
            };
            let owo: UpdatedFile = UpdatedFile {
                path: path,
                hash: row.get::<String, &str>("curr_hash").to_string(),
                size: row.get::<i32, &str>("size"),
                change: change
            };

            Ok(owo)
        }
        Err(err) => {
            println!("error getting file info: {}", err);

            Ok(UpdatedFile {
                path: "".to_string(),
                hash: "".to_string(),
                size: 0,
                change: ChangeType::NoChange
            })
        }
    }
}

pub fn get_file_as_byte_vec(abs_filepath: &String) -> Vec<u8> {
    println!("get file as byte vec: {}", abs_filepath);
    let mut f = File::open(&abs_filepath).expect("no file found");
    let metadata = fs::metadata(&abs_filepath).expect("unable to read metadata");
    let mut buffer = vec![0; metadata.len() as usize];
    f.read(&mut buffer).expect("buffer overflow");

    buffer
}

pub async fn get_cache_dir(pool: &Pool<Sqlite>) -> Result<String, ()> {
    let server_dir = get_server_dir(pool).await;
    match server_dir {
        Ok(dir) => {
            // TODO change \\ to os agnostic
            let output = dir + "\\" + ".glassycache";
            Ok(output)
        },
        Err(_err) => {
            println!("error getting cache dir");
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
        },
        Err(_err) => {
            println!("error getting trash dir");
            Ok("".to_string())
        }
    }
}

pub async fn get_basehash(pid: i32, path: String, pool: &Pool<Sqlite>) -> Result<String, ()> {
    let result = sqlx::query(
    "SELECT base_hash FROM file WHERE
        pid = $1 AND filepath = $2 LIMIT 1
        "
    )
    .bind(pid)
    .bind(path)
    .fetch_one(pool).await;

    match result {
        Ok(row) => {
            Ok(row.get::<String, &str>("base_hash"))
        },
        Err(err) => {
            println!("error getting base_hash: {}", err);
            Err(())
        }
    }
}

// clear trash bin
pub async fn delete_trash(pool: &Pool<Sqlite>) -> Result<bool, ()> {
    let trash_dir = get_trash_dir(pool).await.unwrap();
    match remove_dir_all(Path::new(&trash_dir)) {
        Ok(_res) => {
            Ok(true)
        },
        Err(err) => {
            println!("error deleting trash: {}", err);
            Ok(false)
        }
    }
}