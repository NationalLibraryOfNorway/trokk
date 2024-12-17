use std::ffi::OsString;
use std::sync::Mutex;

use gethostname::gethostname;
use once_cell::sync::Lazy;
use tauri::Manager;
use tauri::Window;
use tokio::sync::OnceCell;

use crate::image_converter::ConversionCount;
use crate::model::{AuthenticationResponse, RequiredEnvironmentVariables, SecretVariables};

mod auth;
mod error;
mod file_utils;
mod image_converter;
mod model;
mod s3;
#[cfg(desktop)]
mod tray;
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
async fn convert_to_webp(file_path: String) -> Result<(), String> {
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

static CURRENT_DIRECTORIES_PROCESSING: Lazy<Mutex<Vec<String>>> =
	Lazy::new(|| Mutex::new(Vec::new()));

#[tauri::command]
async fn convert_directory_to_webp(directory_path: String) -> Result<ConversionCount, String> {
	{
		// Lock the Mutex to safely access the shared state
		let mut directories = CURRENT_DIRECTORIES_PROCESSING.lock().unwrap();
		if directories.contains(&directory_path) {
			return Ok(ConversionCount {
				converted: 0,
				already_converted: 0,
			});
		}

		directories.push(directory_path.clone());
	} // The lock is automatically released here when the scope ends

	let directory_path_clone = directory_path.clone();

	// Convert the directory to webp asynchronously
	let result = tokio::task::spawn_blocking(move || {
		image_converter::convert_directory_to_webp(directory_path_clone)
	})
	.await
	.expect("Failed to run blocking task");

	// Lock the Mutex again to update the directories
	let mut directories = CURRENT_DIRECTORIES_PROCESSING.lock().unwrap();

	directories.retain(|dir| dir != &directory_path); // Remove the directory from the list after processing

	// Return the result
	match result {
		Ok(count) => Ok(count),
		Err(e) => Err(e.to_string()),
	}
	// Directories mutex unlocked at end of scope.
}

#[tauri::command]
async fn delete_dir(dir: &str) -> Result<(), String> {
	file_utils::delete_dir(dir)
}

#[tauri::command]
async fn pick_directory<R: tauri::Runtime>(
	start_path: String,
	app_handle: tauri::AppHandle<R>,
) -> Result<String, String> {
	let start_path_clone = start_path.clone();
	let app_handle_clone = app_handle.clone();

	let opt = tokio::task::spawn_blocking(|| {
		file_utils::directory_picker(start_path_clone, app_handle_clone)
	})
	.await
	.expect("Failed to run blocking task");

	if let Some(value) = opt {
		Ok(value)
	} else {
		Err("Could not pick directory".to_string())
	}
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
) -> Result<usize, String> {
	s3::upload_directory(directory_path, object_id, material_type, app_window).await
}

#[tauri::command]
fn get_webview_version() -> String {
	tauri::webview_version().unwrap()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
	tauri::async_runtime::set(tokio::runtime::Handle::current());
	tauri::Builder::default()
		.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
			let _ = app
				.get_webview_window("main")
				.expect("no main window")
				.set_focus();
		}))
		.plugin(tauri_plugin_store::Builder::new().build())
		.plugin(tauri_plugin_http::init())
		.plugin(tauri_plugin_process::init())
		.plugin(tauri_plugin_dialog::init())
		.plugin(tauri_plugin_store::Builder::default().build())
		.plugin(tauri_plugin_fs::init())
		.plugin(tauri_plugin_oauth::init())
		.setup(|app| {
			app.get_webview_window("main").unwrap().open_devtools();
			{
				let handle = app.handle();
				tray::create_tray(handle)?;
			}
			Ok(())
		})
		.invoke_handler(tauri::generate_handler![
			get_hostname,
			get_secret_variables,
			log_in,
			refresh_token,
			convert_to_webp,
			convert_directory_to_webp,
			delete_dir,
			pick_directory,
			get_papi_access_token,
			upload_directory_to_s3,
			get_webview_version
		])
		.on_window_event(|window, event| {
			if let tauri::WindowEvent::CloseRequested { api, .. } = event {
				window.hide().unwrap();
				api.prevent_close();
			}
		})
		.build(tauri::generate_context!())
		.expect("error while running tauri application")
		.run(|_app_handle, _event| {});
}
