// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::ffi::OsString;

use gethostname::gethostname;
use tauri::Manager;

#[tauri::command]
fn get_hostname() -> Result<String, OsString> {
    return gethostname().into_string()
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            #[cfg(debug_assertions)]
            app.get_window("main").unwrap().open_devtools(); // `main` is the first window from tauri.conf.json without an explicit label
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_hostname])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
