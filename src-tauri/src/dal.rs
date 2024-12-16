use sqlx::{Pool, Row, Sqlite};
use std::path::Path;
use std::result::Result::Ok;
use crate::types::{ChangeType, UpdatedFile};

pub struct DataAccessLayer<'a> {
    pub pool: &'a Pool<Sqlite>
}

impl<'a> DataAccessLayer<'a> {
    pub fn new(user_pool: &'a Pool<Sqlite>) -> Self {
        DataAccessLayer { pool: &user_pool }
    }

    /// gets the current server URL to use for network calls
    pub async fn get_current_server(&self) -> Result<String, ()> {
        let output = sqlx::query("SELECT CASE WHEN debug_active = 1 THEN debug_url ELSE url END as url FROM server WHERE active = 1")
            .fetch_one(self.pool).await;
    
        match output {
            Ok(row) => Ok(row.get::<String, &str>("url")),
            Err(err) => {
                log::error!("couldn't get the current server url: {}", err);
                Ok("".to_string())
            }
        }
    }

    /// gets the current server URL for db foreign key purposes
    pub async fn get_active_server(&self) -> Result<String, ()> {
        let output = sqlx::query("SELECT url FROM server WHERE active = 1")
            .fetch_one(self.pool)
            .await;
    
        match output {
            Ok(row) => Ok(row.get::<String, &str>("url")),
            Err(err) => {
                log::error!("couldn't get the active server url: {}", err);
                Ok("".to_string())
            }
        }
    }

    /// deletes an entry from the file table
    pub async fn delete_file_entry(&self, pid: i32, path: String) -> Result<bool, ()> {
        let _ = sqlx::query(
            "DELETE FROM file
            WHERE pid = $1 AND filepath = $2",
        )
        .bind(pid)
        .bind(path)
        .execute(self.pool)
        .await;
        Ok(true)
    }

    /// get the project directory for the specified project
    pub async fn get_project_dir(&self, pid: i32) -> Result<String, ()> {
        //println!("current allocating {}B", get_allocated());
        let server = self.get_active_server().await.unwrap();
        let db_call = sqlx::query("SELECT server.local_dir, project.title, project.team_name FROM server, project WHERE server.active = 1 AND project.url = ? AND project.pid = ?")
            .bind(server)
            .bind(pid)
            .fetch_one(self.pool)
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

    pub async fn get_file_info(&self, pid: i32, path: String) -> Result<UpdatedFile, ()> {
        let output = sqlx::query(
            "SELECT curr_hash, size, change_type, in_fs FROM file WHERE filepath = $1 AND pid = $2",
        )
        .bind(path.clone())
        .bind(pid)
        .fetch_one(self.pool)
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

    pub async fn get_basehash(&self, pid: i32, path: String) -> Result<String, ()> {
        let result = sqlx::query(
            "SELECT base_hash FROM file WHERE
            pid = $1 AND filepath = $2 LIMIT 1
            ",
        )
        .bind(pid)
        .bind(path)
        .fetch_one(self.pool)
        .await;
    
        match result {
            Ok(row) => Ok(row.get::<String, &str>("base_hash")),
            Err(err) => {
                log::error!("could not get base_hash: {}", err);
                Err(())
            }
        }
    }
    
    // TODO necessary to have in dal?
    pub async fn update_file_entry(&self, pid: i32, path: String) -> Result<bool, ()> {
            let _ = sqlx::query(
            "
            UPDATE file SET
            base_hash = tracked_hash,
            curr_hash = tracked_hash,
            base_commitid = tracked_commitid,
            size = tracked_size,
            in_fs = 1,
            change_type = 0
            WHERE pid = $1 AND filepath = $2
            ",
        )
        .bind(pid)
        .bind(path)
        .execute(self.pool)
        .await;
        Ok(true)
    }
} // end impl DataAcessLayer<'_>

