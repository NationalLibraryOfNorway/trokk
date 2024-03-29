// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::ffi::OsString;

use gethostname::gethostname;
#[cfg(debug_assertions)]
use tauri::Manager;
use tauri::Window;

use crate::model::{AuthenticationResponse, RequiredEnvironmentVariables};

mod auth;
mod error;
mod file_utils;
mod image_converter;
mod model;
mod system_tray;

#[cfg(test)]
mod tests;

pub static ENVIRONMENT_VARIABLES: RequiredEnvironmentVariables = RequiredEnvironmentVariables {
	papi_path: env!("PAPI_PATH"),
	oidc_base_url: env!("OIDC_BASE_URL"),
	oidc_client_id: env!("OIDC_CLIENT_ID"),
	oidc_client_secret: env!("OIDC_CLIENT_SECRET"),
	oidc_tekst_base_url: env!("OIDC_TEKST_BASE_URL"),
	oidc_tekst_client_id: env!("OIDC_TEKST_CLIENT_ID"),
	oidc_tekst_client_secret: env!("OIDC_TEKST_CLIENT_SECRET"),
};

#[tauri::command]
fn get_hostname() -> Result<String, OsString> {
	gethostname().into_string()
}

#[tauri::command]
fn get_required_env_variables() -> RequiredEnvironmentVariables {
	ENVIRONMENT_VARIABLES.clone()
}

#[tauri::command]
async fn log_in(window: Window) -> Result<u16, String> {
	// Returns the token via the `token_exchanged` window event
	auth::log_in_with_server_redirect(window)
}

#[tauri::command]
async fn refresh_token(refresh_token: String) -> AuthenticationResponse {
	auth::refresh_token(refresh_token).await
}

#[tauri::command]
fn convert_to_webp(file_path: String) -> Result<(), String> {
	match image_converter::check_if_webp_exists(&file_path) {
		Ok(exists) => {
			if exists {
				return Ok(());
			}
		}
		Err(e) => {
			e.to_string();
		}
	}

	match image_converter::convert_to_webp(file_path) {
		Ok(_) => Ok(()),
		Err(e) => Err(e.to_string()),
	}
}

#[tauri::command]
fn get_total_size_of_files_in_folder(path: String) -> Result<u64, String> {
	file_utils::get_file_size(&path)
}

#[tauri::command]
fn copy_dir(old_dir: String, new_base_dir: String, new_dir_name: String) -> Result<String, String> {
	file_utils::copy_dir_contents(old_dir, new_base_dir, new_dir_name)
}

#[tauri::command]
fn delete_dir(dir: String) -> Result<(), String> {
	file_utils::delete_dir(dir)
}

#[tauri::command]
async fn pick_directory(start_path: String) -> Result<String, String> {
	file_utils::directory_picker(start_path).await
}

#[tauri::command]
async fn get_papi_access_token() -> Result<String, String> {
	auth::get_access_token_for_papi()
		.await
		.map_err(|e| format!("Could not get token for Papi. {e:?}"))
}

fn main() {
	tauri::Builder::default()
		.plugin(tauri_plugin_store::Builder::default().build())
		.plugin(tauri_plugin_fs_watch::init())
		.setup(|_app| {
			#[cfg(debug_assertions)]
			_app.get_window("main").unwrap().open_devtools(); // `main` is the first window from tauri.conf.json without an explicit label
			Ok(())
		})
		.invoke_handler(tauri::generate_handler![
			get_hostname,
			get_required_env_variables,
			log_in,
			refresh_token,
			convert_to_webp,
			get_total_size_of_files_in_folder,
			copy_dir,
			delete_dir,
			pick_directory,
			get_papi_access_token
		])
		.system_tray(system_tray::get_system_tray())
		.on_system_tray_event(system_tray::system_tray_event_handler())
		.on_window_event(system_tray::run_frontend_in_background_on_close())
		.build(tauri::generate_context!())
		.expect("error while running tauri application")
		.run(system_tray::run_backend_in_background_on_close());
}
