// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::ffi::OsString;

use gethostname::gethostname;
use tauri::Manager;
use tauri::Window;

use crate::model::{AuthenticationResponse, RequiredEnvironmentVariables};

mod auth;
mod error;
mod file_size;
mod image_converter;
mod model;

pub static ENVIRONMENT_VARIABLES: RequiredEnvironmentVariables = RequiredEnvironmentVariables {
	papi_path: env!("PAPI_PATH"),
	oidc_base_url: env!("OIDC_BASE_URL"),
	oidc_client_id: env!("OIDC_CLIENT_ID"),
	oidc_client_secret: env!("OIDC_CLIENT_SECRET"),
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
	file_size::get_file_size(&path)
}

fn main() {
	tauri::Builder::default()
		.plugin(tauri_plugin_store::Builder::default().build())
		.plugin(tauri_plugin_fs_watch::init())
		.setup(|app| {
			#[cfg(debug_assertions)]
			app.get_window("main").unwrap().open_devtools(); // `main` is the first window from tauri.conf.json without an explicit label
			Ok(())
		})
		.invoke_handler(tauri::generate_handler![
			get_hostname,
			get_required_env_variables,
			log_in,
			refresh_token,
			convert_to_webp,
			get_total_size_of_files_in_folder
		])
		.run(tauri::generate_context!())
		.expect("error while running tauri application");
}
