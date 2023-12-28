use std::fs::{File, self};
use std::io::Write;
use std::path::PathBuf;
use log::{error, info};

use crate::types::Change;
use crate::settings::get_app_local_data_dir;

#[tauri::command]
pub fn update_upload_list(app_handle: tauri::AppHandle, changes: Vec<Change>) -> Vec<Change> {
    let mut data_dir: PathBuf = get_app_local_data_dir(&app_handle);
    data_dir.push("toUpload.json");
    let upload_str = match fs::read_to_string(&data_dir) {
        Ok(content) => content,
        Err(_error) => "n/a".to_string(),
    };

    if upload_str == "n/a" {
        error!("wasn't able to read toUpload.json");
        // TODO could handle this better, maybe panic instead?
        let output: Vec<Change> = Vec::new();
        return output;
    }
    let mut upload_list: Vec<Change> = serde_json::from_str(&upload_str).expect("toUpload.json not formatted");

    // remove files in the initial upload list that are in changes
    for change in changes {
        upload_list.retain(|file| file.file.path != change.file.path);
    }

    // write toUpload.json
    let json = match serde_json::to_string(&upload_list) {
        Ok(string) => string,
        Err(error) => {
            error!("Problem writing to toUpload.json: {}", error);
            panic!("Problem writing to toUpload.json: {}", error);
        },
    };

    let mut file = File::create(data_dir).unwrap();
    let _ = file.write_all(json.as_bytes());

    info!("toUpload.json updated");
    return upload_list;
}