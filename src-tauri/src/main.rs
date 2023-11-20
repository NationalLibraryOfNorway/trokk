// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::collections::HashMap;
use std::ffi::OsString;
use gethostname::gethostname;
use tauri::Manager;

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn get_hostname() -> Result<String, OsString> {
    return gethostname().into_string()
}

#[tauri::command]
fn get_required_env_variables() -> HashMap<String, String> {
    let mut env_variables = HashMap::new();
    env_variables.insert("PAPI_PATH".to_string(), env!("PAPI_PATH").to_string());
    env_variables
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            #[cfg(debug_assertions)]
            app.get_window("main").unwrap().open_devtools(); // `main` is the first window from tauri.conf.json without an explicit label
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_hostname, get_required_env_variables])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
