use std::path::PathBuf;
use std::fs::{self};
use log::info;
use crate::sync::hash_dir;
use crate::util::pathbuf_to_string;

pub fn get_app_local_data_dir(app_handle: &tauri::AppHandle) -> PathBuf {
    return app_handle.path_resolver().app_local_data_dir().unwrap();
}

#[tauri::command]
pub fn update_server_url(app_handle: tauri::AppHandle, new_url: String) {
    let appdir = get_app_local_data_dir(&app_handle);
    let path = appdir.join("server_url.txt");

    let _ = fs::write(path, new_url.clone());
    info!("Server URL updated to {}", new_url);
}

#[tauri::command]
pub fn get_server_url(app_handle: tauri::AppHandle) -> String {
    let appdir = get_app_local_data_dir(&app_handle);
    let path = appdir.join("server_url.txt");
    let output: String = match fs::read_to_string(path) {
        Ok(contents) => return contents,
        Err(_err) => "".to_string(),
    };
    return output;
}

#[tauri::command]
pub fn get_project_dir(app_handle: tauri::AppHandle) -> String {
    let appdir = get_app_local_data_dir(&app_handle);
    let path = appdir.join("project_dir.benji");
    let output: String = match fs::read_to_string(path) {
        Ok(contents) => return contents,
        Err(_err) => "no project directory set".to_string(),
    };
    return output;
}

#[tauri::command]
pub fn update_project_dir(app_handle: tauri::AppHandle, dir: PathBuf) {
    info!("Updating project directory");
    let appdir = get_app_local_data_dir(&app_handle);
    let mut path = appdir.join("project_dir.benji");
    let _ = fs::write(path, pathbuf_to_string(dir));

    // update base.dat
    path = appdir.join("base.dat");
    //let _ = fs::write(path, "[]");
    hash_dir(app_handle, &pathbuf_to_string(path), Vec::new());
}