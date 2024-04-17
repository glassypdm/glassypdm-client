// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use tauri_plugin_sql::{Migration, MigrationKind};

fn main() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql:"CREATE TABLE server (url TEXT PRIMARY KEY, clerk_publickey TEXT, local_dir TEXT, active INTEGER, debug_url TEXT);
            CREATE TABLE project (id INTEGER PRIMARY KEY, server_url TEXT, active INTEGER, current_commitid INTEGER);
            CREATE TABLE file (path TEXT PRIMARY KEY);

            CREATE TABLE debug (server INTEGER PRIMARY KEY, active INTEGER)
            ", // TODO determine file schema
            kind: MigrationKind::Up,
        }
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:glassypdm.db", migrations)
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
