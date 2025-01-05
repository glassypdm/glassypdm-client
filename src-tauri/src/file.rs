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
    // TODO move to dal
    // FIXME ignore in_fs = 0, base_hash == '', tracked_changetype == 3
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

pub async fn add_ignore_list_entry(project_id: i32, server_url: String, path: String, pool: &Pool<Sqlite>) -> Result<bool, ()> {
    match sqlx::query("INSERT INTO projectignorelist(pid, url, path) VALUES ($1, $2, $3);")
        .bind(project_id)
        .bind(server_url)
        .bind(path)
        .execute(pool)
        .await {
            Ok(res) => {
                // TODO check res, lmao
                Ok(true)
            },
            Err(err) => {
                // TODO
                Ok(false)
            }
    }
}

pub async fn remove_ignore_list_entry(project_id: i32, server_url: String, path: String, pool: &Pool<Sqlite>) -> Result<bool, ()> {
    match sqlx::query("DELETE FROM projectignorelist WHERE pid = $1 AND url = $2 AND path = $3;")
        .bind(project_id)
        .bind(server_url)
        .bind(path)
        .execute(pool)
        .await {
            Ok(res) => {
                // TODO check res, lmao
                Ok(true)
            },
            Err(err) => {
                // TODO
                Ok(false)
            }
    }
}

/* */
pub async fn get_ignore_list(project_id: i32, server_url: String, pool: &Pool<Sqlite>) -> Result<Vec<String>, ()> {
    let output: Vec<String> = match sqlx::query_scalar("SELECT path FROM projectignorelist WHERE pid = $1 AND url = $2;")
        .bind(project_id)
        .bind(server_url)
        .fetch_all(pool)
        .await {
            Ok(res) => res,
            Err(err) => {
                // TODO print and return error, not empty list
                Vec::<String>::new()
            }
    };
    Ok(output)
}

// check if file is in the ignore list for a given project
pub async fn should_file_be_ignored(project_id: i32, server_url: String, file: String, pool: &Pool<Sqlite>) -> Result<bool, ()> {
    let ignore_list = get_ignore_list(project_id, server_url, pool).await.unwrap();
    // TODO get the parent path from the file (basically the path of its containing folder)
    
    // TODO check if the parent path is a substring of any of the paths in the ignore list
    // break this into a function so that can be unit tested
    Ok(true)
}

// convert forward slashes to backward slashes or vice versa
pub fn translate_filepath(path: &String, to_unix: bool) -> String {
    let out;
    if to_unix { // backward slashes to forwards
        out = path.replace('\\', "/");
    } else { // forward slashes to backwards
        out = path.replace("/", "\\");
    }
    out
}

pub fn sep() -> char {
    #[cfg(target_os = "windows")]
    {
        '\\'
    }
    #[cfg(target_os = "linux")]
    {
        '/'
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    struct TestCaseTranslateFilePath {
        set_path: String,
        set_to_unix: bool,
        exp_path: String
    }

    #[test]
    fn test_translate_filepath() {
        // initialize test cases
        let test_cases: Vec<TestCaseTranslateFilePath> = vec![
            TestCaseTranslateFilePath { set_path: "path/to/file".to_string(), set_to_unix: false, exp_path: "path\\to\\file".to_string()},
            TestCaseTranslateFilePath { set_path: "path/to/file".to_string(), set_to_unix: true, exp_path: "path/to/file".to_string()},
            TestCaseTranslateFilePath { set_path: "path\\to\\file".to_string(), set_to_unix: true, exp_path: "path/to/file".to_string()},
            TestCaseTranslateFilePath { set_path: "path\\to\\file".to_string(), set_to_unix: false, exp_path: "path\\to\\file".to_string()}
        ];
        
        // run function under test and validate results
        for case in test_cases {
            let ret = translate_filepath(&case.set_path, case.set_to_unix);
            assert_eq!(ret, case.exp_path);
        }
    }

    #[test]
    fn test_sep() {
        #[cfg(target_os = "windows")]
        {
            assert_eq!('\\', sep());
        }

        #[cfg(target_os = "linux")]
        {
            assert_eq!('/', sep());
        }
    }
}