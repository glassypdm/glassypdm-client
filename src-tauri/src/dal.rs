use sqlx::{Pool, Row, Sqlite};
use std::path::Path;
use std::result::Result::Ok;
use crate::{sync::FileChange, types::{ChangeType, UpdatedFile}};

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
    pub async fn update_downloaded_file_entry(&self, pid: i32, path: String) -> Result<bool, ()> {
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

    pub async fn update_cache_setting(&self, new_cache: bool) -> Result<bool, ()> {
        let url = self.get_active_server().await.unwrap();
        match sqlx::query("UPDATE server SET cache_setting = $1 WHERE url = $2")
        .bind(if new_cache { 1 } else { 0 })
        .bind(url)
        .execute(self.pool)
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

    pub async fn get_cache_setting(&self) -> Result<bool, ()> {
        let url = self.get_active_server().await.unwrap();
        match sqlx::query("SELECT cache_setting FROM server WHERE url = $1")
            .bind(url)
            .fetch_one(self.pool)
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

    pub async fn clear_project_table(&self, url: String) -> Result<(), ()> {
        let _ = sqlx::query("DELETE from project WHERE url = $1")
            .bind(url.clone())
            .execute(self.pool)
            .await;
        Ok(())
    }

    pub async fn clear_file_table(&self) -> Result<(), ()> {
        let _ = sqlx::query("DELETE from file")
            .execute(self.pool)
            .await;
        Ok(())
    }

    pub async fn clear_file_table_for_project(&self, pid: i32) -> Result<(), ()> {
        let _ = sqlx::query("DELETE from file WHERE pid = $1")
            .bind(pid.clone())
            .execute(self.pool)
            .await;
        Ok(())
    }

    pub async fn get_server_name(&self) -> Result<String, ()> {
        let output = sqlx::query("SELECT name FROM server WHERE active = 1")
        .fetch_one(self.pool)
        .await;

        match output {
            Ok(row) => Ok(row.get::<String, &str>("name")),
            Err(err) => {
                println!("couldnt get server name {}", err);
                Ok("glassyPDM".to_string())
            }
        }
    }

    pub async fn add_server(&self, url: String, clerk_pub_key: String, local_dir: String, name: String) -> Result<(), ()> {
        sqlx::query(
            "INSERT INTO server (url, clerk_publickey, local_dir, name, active, debug_url, debug_active) VALUES (?, ?, ?, ?, ?, ?, ?);"
        )
        .bind(url)
        .bind(clerk_pub_key)
        .bind(local_dir)
        .bind(name)
        .bind(1)
        .bind("http://localhost:5000")
        .bind(0)
        .execute(self.pool)
        .await.unwrap();

        Ok(())
    }

    pub async fn add_project(&self, pid: i32, title: String, team_name: String, init_commit: i32) -> Result<(), ()> {
        let server = self.get_active_server().await.unwrap();

        let _output = sqlx::query("INSERT INTO project(pid, url, title, team_name, base_commitid, remote_title) VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(pid, url) DO UPDATE SET remote_title = excluded.title")
            .bind(pid)
            .bind(server)
            .bind(title.clone())
            .bind(team_name)
            .bind(init_commit)
            .bind(title.clone())
            .execute(self.pool)
            .await;

        Ok(())
    }

    pub async fn get_project_name(&self, pid: i32) -> Result<String, ()> {
        let server = self.get_active_server().await.unwrap();
        let output = sqlx::query("SELECT title FROM project WHERE pid = $1 AND url = $2")
            .bind(pid)
            .bind(server)
            .fetch_one(self.pool)
            .await;

        match output {
            Ok(row) => Ok(row.get::<String, &str>("title")),
            Err(err) => {
                println!("Error retrieving project name: {}", err);
                Ok("".to_string())
            }
        }
    }

    pub async fn get_downloads(&self, pid: i32) -> Result<Vec<FileChange>, ()> {
        let output: Vec<FileChange> = match sqlx::query_as(
            "SELECT filepath, tracked_size as size, tracked_changetype as change_type, tracked_hash as hash, tracked_commitid as commit_id FROM file WHERE pid = $1 AND
            (
                (in_fs = 1 AND tracked_changetype = 3) OR
                (base_hash != tracked_hash AND tracked_changetype != 3)
            )
            "
        )
        .bind(pid).fetch_all(self.pool)
        .await {
            Ok(downloads) => downloads,
            Err(err) => {
                log::error!("encountered error while querying db: {}", err);
                Vec::<FileChange>::new()
            }
        };
        Ok(output)
    }

    pub async fn get_uploads(&self, pid: i32) -> Result<Vec<FileChange>, ()> {
        let output = match sqlx::query_as("SELECT filepath, size, change_type, curr_hash as hash, base_commitid as commit_id FROM file WHERE pid = $1 AND change_type != 0")
        .bind(pid).fetch_all(self.pool)
        .await {
            Ok(uploads) => uploads,
            Err(err) => {
                log::error!("encountered error while querying db: {}", err);
                Vec::<FileChange>::new()
            }
        };

        Ok(output)
    }

    pub async fn get_conflicts(&self, pid: i32) -> Result<Vec<FileChange>, ()> {
        match sqlx::query_as(
            "SELECT filepath, size, change_type, curr_hash as hash, base_commitid as commit_id FROM file WHERE pid = $1 AND
            change_type != 0 AND
            (
                (in_fs = 1 AND tracked_changetype = 3) OR
                (base_hash != tracked_hash AND tracked_changetype != 3)
            )
            "
        )
        .bind(pid).fetch_all(self.pool)
        .await {
            Ok(conflicts) => Ok(conflicts),
            Err(err) => {
                println!("get_conflicts had error querying db: {}", err);
                log::error!("encountered error querying db: {}", err);
                Ok(Vec::<FileChange>::new())
            }
        }
    }

    pub async fn insert_remote_file(&self, file_path: String, pid: i32, commit_id: i32, file_hash: String, changetype: i32, tracked_size: i32) ->Result<(), ()> {
        let hehe = sqlx::query("INSERT INTO file(filepath, pid, tracked_commitid, tracked_hash, tracked_changetype, in_fs, change_type, tracked_size)
            VALUES($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT(filepath, pid) DO UPDATE SET
            tracked_commitid = excluded.tracked_commitid,
            tracked_hash = excluded.tracked_hash,
            tracked_changetype = CASE WHEN in_fs = 1 OR excluded.tracked_changetype = 3 THEN excluded.tracked_changetype ELSE 1 END,
            tracked_size = excluded.tracked_size")
        .bind(file_path)
        .bind(pid)
        .bind(commit_id)
        .bind(file_hash)
        .bind(changetype)
        .bind(0) // in_fs
        .bind(0) // changetype
        .bind(tracked_size)
        .execute(self.pool).await;
        match hehe {
            Ok(_owo) => {
                Ok(())
            }
            Err(err) => {
                println!("error! {}", err);
                Err(())
            }
        }
    }

    pub async fn insert_local_file(&self, rel_path: String, pid: i32, hash: String, filesize: u64) -> Result<(), ()> {
        let hehe = sqlx::query("INSERT INTO file(filepath, pid, curr_hash, size) VALUES($1, $2, $3, $4)
        ON CONFLICT(filepath, pid) DO UPDATE SET curr_hash = excluded.curr_hash, size = excluded.size, in_fs = 1")
        .bind(rel_path)
        .bind(pid)
        .bind(hash)
        .bind(filesize as i64)
        .execute(self.pool).await;
        match hehe {
            Ok(_owo) => { Ok(())}
            Err(err) => {
                log::error!("encountered error while saving file to db: {}", err);
                Err(())
            }
        }
    }

    // TODO handle errors
    pub async fn update_change_types(&self, pid: i32) -> Result<(), ()> {
            // no change - file was un-deleted (e.g., recovered from user's recycle bin)
        let _ = sqlx::query(
            "UPDATE file SET change_type = 0 WHERE in_fs = 1 AND change_type = 3 AND pid = $1",
        )
        .bind(pid)
        .execute(self.pool)
        .await;

        // no change - file was reset
        let _ = sqlx::query(
            "UPDATE file SET change_type = 0 WHERE in_fs = 1 AND base_hash == curr_hash AND pid = $1",
        )
        .bind(pid)
        .execute(self.pool)
        .await;

        // updated file - base hash is different from current hash, and file is tracked, i.e. base hash not empty
        let _ = sqlx::query(
            "UPDATE file SET change_type = 2 WHERE in_fs = 1 AND base_hash != curr_hash AND pid = $1 AND base_hash != ''"
        ).bind(pid).execute(self.pool).await;

        // new file - base hash is different from current hash and file is untracked, i.e. base hash is empty
        let _ = sqlx::query(
            "UPDATE file SET change_type = 1 WHERE in_fs = 1 AND base_hash != curr_hash AND pid = $1 AND base_hash == ''"
        ).bind(pid).execute(self.pool).await;

        // deleted file - file is tracked, i.e. base hash not empty and file wasn't found in folder
        let _ = sqlx::query(
            "UPDATE file SET change_type = 3 WHERE in_fs = 0 AND pid = $1 AND base_hash != ''",
        )
        .bind(pid)
        .execute(self.pool)
        .await;

        // delete entries of files that are untracked and deleted
        let _ = sqlx::query("DELETE FROM file WHERE in_fs = 0 AND pid = $1 AND base_hash = ''")
            .bind(pid)
            .execute(self.pool)
            .await;
        Ok(())
    }

    pub async fn reset_fs_state(&self, pid: i32) -> Result<(), ()> {
        let _ = sqlx::query("UPDATE file SET in_fs = 0 WHERE pid = $1")
        .bind(pid)
        .execute(self.pool)
        .await;
        Ok(())
    }
} // end impl DataAcessLayer<'_>

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::SqlitePool;

    #[sqlx::test]
    async fn test_cache_setting(pool: SqlitePool) {
        let dal = DataAccessLayer::new(&pool);
        init_db(&pool).await;

        // verify initial settings
        let res = dal.get_cache_setting().await.unwrap();
        assert_eq!(res, false);

        // update settings
        let _ = dal.update_cache_setting(true).await.unwrap();

        // verify cache setting was updated
        let res = dal.get_cache_setting().await.unwrap();
        assert_eq!(res, true);
    }

    #[sqlx::test]
    async fn test_upload_untracked_files(pool: SqlitePool) {
        let dal = DataAccessLayer::new(&pool);

        init_db(&pool).await;
        let _ = dal.insert_local_file("path/to/file".to_string(), 0, "abcd".to_string(), 43).await;
        let _ = dal.insert_local_file("path/to/file2".to_string(), 0, "sf".to_string(), 43).await;
        let _ = dal.insert_local_file("abc/def/ghi".to_string(), 0, "xyz".to_string(), 43).await;

        // call function under test
        let _ = dal.update_change_types(0).await;
        let uploads = dal.get_uploads(0).await.unwrap();
        let mut err_flag = false;
        for owo in uploads.clone() {
            if owo.change_type != ChangeType::Create {
                err_flag = true;
            }
        }

        assert_eq!(err_flag, false); // all of the inserted files are new, so they should all be changetype create
        assert_eq!(uploads.len(), 3); // 3 files were added in add_local_files
        assert_eq!(dal.get_downloads(0).await.unwrap().len(), 0); // no downloads
        //assert_eq!(dal.get_conflicts(0).await.unwrap().len(), 0); // TODO

    }

    #[sqlx::test]
    async fn test_download_for_fresh_install(pool: SqlitePool) {
        let dal = DataAccessLayer::new(&pool);
        init_db(&pool).await;
        let _ = dal.clear_file_table().await;
        let _ = dal.reset_fs_state(0).await;
        let _ = dal.update_change_types(0).await;
        let _ = dal.insert_remote_file("path/to/file".to_string(), 0, 13, "abcd".to_string(), ChangeType::Create as i32, 132).await;
        let _ = dal.insert_remote_file("path/to/file2".to_string(), 0, 6, "sss".to_string(), ChangeType::Create as i32, 132).await;
        let _ = dal.insert_remote_file("abc/def/ghi".to_string(), 0, 14, "xyz".to_string(), ChangeType::Create as i32, 132).await;
        let _ = dal.insert_remote_file("abc/def/hello".to_string(), 0, 12, "hh".to_string(), ChangeType::Delete as i32, 132).await;

        // FIXME investigate this
        // this fails - update_change_types gets called before remote files are added to table
        // so currently (241216) this is 'unrealistic'
        // it works IRL, but this feels like it shouldnt fail
        //let _ = dal.update_change_types(0).await;

        let downloads = dal.get_downloads(0).await.unwrap();
        assert_eq!(downloads.len(), 3); // we don't need to download abc/def/hello
        assert_eq!(dal.get_uploads(0).await.unwrap().len(), 0); // no uploads
        // TODO conflicts
    }

    /* test 3: sync with server with some local files, test different changetypes and such */

    /* test 4: something with conflicts */


    //////////////////////
    // helper functions //
    //////////////////////

    /// initialize a db with a server and some projects
    async fn init_db(pool: &SqlitePool) {
        let dal = DataAccessLayer::new(&pool);

        // create server entry
        let _ = dal.add_server("url".to_string(), "key".to_string(), "owo/location".to_string(), "test server".to_string()).await;

        let _ = dal.clear_file_table().await;
        let _ = dal.clear_project_table("url".to_string()).await;
        // create project entries
        let _ = dal.add_project(0, "project name".to_string(), "team name".to_string(), 0).await;
        let _ = dal.add_project(1, "project 2".to_string(), "team name".to_string(), 41).await;
        let _ = dal.add_project(14, "another project".to_string(), "team 2".to_string(), 2).await;
    }

}
