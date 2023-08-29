// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::api::dialog;
use tauri::api::path::local_data_dir;
use tauri::{CustomMenuItem, Menu, MenuItem, Submenu};

static mut local_path: &str = "";
// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    let output: String = format!("Hello, {}! You've been greeted from Rust!", name);
    println!("helasdfasdfasdfsdf");
    return output;
}

#[tauri::command]
fn get_directory(path: &str) {
    println!("path: {}", path);
}

fn main() {
    let open = CustomMenuItem::new("open".to_string(), "Open");
    let fileMenu = Submenu::new("File", Menu::new().add_item(open));
    let menu = Menu::new()
      .add_submenu(fileMenu)
      .add_native_item(MenuItem::Separator)
      .add_native_item(MenuItem::Quit);

    tauri::Builder::default()
        .menu(menu)
        .on_menu_event(|event| match event.menu_item_id() {
        "open" => {
            dialog::FileDialogBuilder::default()
            .add_filter("Markdown", &["md"])
            .pick_folder(|path_buf| match path_buf {
                Some(p) => { println!("{}", p.display()); }
                _ => {}
            });
        }
        _ => {}
        })
        .invoke_handler(tauri::generate_handler![greet])
        .invoke_handler(tauri::generate_handler![get_directory])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
