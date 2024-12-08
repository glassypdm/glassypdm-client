use std::collections::HashSet;
use serde::{Deserialize, Serialize};
use tokio::sync::Mutex;
use sqlx::{Pool, Sqlite};
use tauri::State;

#[derive(sqlx::FromRow, Clone, Serialize, Deserialize)]

pub struct FileSummary {
    pub filepath: String,
    pub change_type: i32,
    pub in_fs: i32
}

#[derive(Clone, Serialize, Deserialize)]
pub struct DirectorySummary {
    pub files: Vec<FileSummary>,
    pub folders: HashSet<String>
}


#[tauri::command]
pub async fn get_files(project_id: i32, directory: String, state_mutex: State<'_, Mutex<Pool<Sqlite>>>) -> Result<DirectorySummary, ()> {
    let pool = state_mutex.lock().await;

    // get files that have the path in the project
    // only return files and folders that are in the directory
    let all_files: Vec<FileSummary> = match sqlx::query_as("SELECT filepath, tracked_changetype as change_type, in_fs FROM file WHERE pid = $1 ORDER BY filepath")
        .bind(project_id).fetch_all(&*pool)
        .await {
            Ok(files) => files,
            Err(err) => {
                log::error!("encountered error while querying db: {}", err);
                Vec::<FileSummary>::new()
            }
    };
    let mut files = Vec::<FileSummary>::new();
    let mut folders = HashSet::<String>::new();
    for file in all_files {
        // skip if file doesnt include path
        let rel_path = match file.filepath.strip_prefix(&directory) {
            Some(path) => path,
            None => {
                continue;
            }
        };

        if rel_path.contains('\\') {
            let folder_name = rel_path.split_at(rel_path.find('\\').unwrap()).0;
            folders.insert(folder_name.to_string() + "\\");
        } else {
            files.push(file);
        }
    }
    return Ok(DirectorySummary{ folders, files})
}