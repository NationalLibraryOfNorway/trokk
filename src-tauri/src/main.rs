// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::ffi::OsString;

use gethostname::gethostname;
#[cfg(debug_assertions)]
use tauri::Manager;
use tauri::Window;
use tokio::sync::OnceCell;

use crate::model::{AuthenticationResponse, RequiredEnvironmentVariables, SecretVariables};

mod auth;
mod error;
mod file_utils;
mod image_converter;
mod model;
mod s3;
mod system_tray;
mod vault;

#[cfg(test)]
mod tests;

pub static ENVIRONMENT_VARIABLES: RequiredEnvironmentVariables = RequiredEnvironmentVariables {
	vault_base_url: env!("VAULT_BASE_URL"),
	vault_role_id: env!("VAULT_ROLE_ID"),
	vault_secret_id: env!("VAULT_SECRET_ID"),
	sentry_environment: env!("SENTRY_ENVIRONMENT"),
	sentry_url: env!("SENTRY_URL"),
};

// Use Tokio's OnceCell to fetch secrets from Vault only once
static VAULT_CELL: OnceCell<SecretVariables> = OnceCell::const_new();

#[tauri::command]
async fn get_secret_variables() -> Result<&'static SecretVariables, String> {
	// Fetch secrets from Vault only once, the cell functions as a cache
	VAULT_CELL
		.get_or_try_init(|| async { vault::fetch_secrets_from_vault().await })
		.await
		.map_err(|e| e.to_string())
}

#[tauri::command]
fn get_hostname() -> Result<String, OsString> {
	gethostname().into_string()
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
fn get_total_size_of_files_in_folder(path: &str) -> Result<u64, String> {
	file_utils::get_file_size(path)
}

#[tauri::command]
async fn copy_dir<R: tauri::Runtime>(
	// ^ Typed this way to handle both Wry and MockRuntime for testing purposes
	old_dir: &str,
	new_base_dir: &str,
	new_dir_name: &str,
	app_handle: tauri::AppHandle<R>,
) -> Result<String, String> {
	file_utils::copy_dir_contents(old_dir, new_base_dir, new_dir_name, app_handle)
}

#[tauri::command]
async fn delete_dir(dir: &str) -> Result<(), String> {
	file_utils::delete_dir(dir)
}

#[tauri::command]
async fn pick_directory(start_path: &str) -> Result<String, String> {
	file_utils::directory_picker(start_path).await
}

#[tauri::command]
async fn get_papi_access_token() -> Result<String, String> {
	auth::get_access_token_for_papi()
		.await
		.map_err(|e| format!("Could not get token for Papi. {e:?}"))
}

#[tauri::command]
async fn upload_directory_to_s3(
	directory_path: &str,
	object_id: &str,
	material_type: &str,
	app_window: Window,
) -> Result<(), String> {
	s3::upload_directory(directory_path, object_id, material_type, app_window).await
}

fn main() {
	let sentry_client = sentry_tauri::sentry::init((
		ENVIRONMENT_VARIABLES.sentry_url,
		sentry_tauri::sentry::ClientOptions {
			release: sentry_tauri::sentry::release_name!(),
			environment: Some(ENVIRONMENT_VARIABLES.sentry_environment.into()),
			..Default::default()
		},
	));

	let _guard = sentry_tauri::minidump::init(&sentry_client);

	tauri::Builder::default()
		.plugin(tauri_plugin_store::Builder::default().build())
		.plugin(tauri_plugin_fs_watch::init())
		.plugin(sentry_tauri::plugin())
		.setup(|_app| {
			#[cfg(debug_assertions)]
			_app.get_window("main").unwrap().open_devtools(); // `main` is the first window from tauri.conf.json without an explicit label
			Ok(())
		})
		.invoke_handler(tauri::generate_handler![
			get_hostname,
			get_secret_variables,
			log_in,
			refresh_token,
			convert_to_webp,
			get_total_size_of_files_in_folder,
			copy_dir,
			delete_dir,
			pick_directory,
			get_papi_access_token,
			upload_directory_to_s3
		])
		.system_tray(system_tray::get_system_tray())
		.on_system_tray_event(system_tray::system_tray_event_handler())
		.on_window_event(system_tray::run_frontend_in_background_on_close())
		.build(tauri::generate_context!())
		.expect("error while running tauri application")
		.run(system_tray::run_backend_in_background_on_close());
}
