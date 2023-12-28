use std::fs;
use std::path::PathBuf;
use log::error;

use crate::types::Change;
use crate::settings::get_app_local_data_dir;

#[tauri::command]
pub fn update_upload_list(app_handle: tauri::AppHandle, files: Vec<Change>) -> Vec<Change> {
    let mut output: Vec<Change> = Vec::new();
    let mut data_dir: PathBuf = get_app_local_data_dir(&app_handle);
    data_dir.push("toUpload.json");
    let upload_str = match fs::read_to_string(data_dir) {
        Ok(content) => content,
        Err(_error) => "n/a".to_string(),
    };

    if upload_str == "n/a" {
        error!("wasn't able to read toUpload.json");
        return output;
    }
    let mut upload_list: Vec<Change> = serde_json::from_str(&upload_str).expect("toUpload.json not formatted");




    return output;
}