use gethostname::gethostname;
use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::ffi::OsString;
use std::string::ToString;
use std::sync::Mutex;
use tauri::Window;
use tokio::sync::OnceCell;

use crate::image_converter::ConversionCount;
#[cfg(not(feature = "debug-mock"))]
use crate::model::RequiredEnvironmentVariables;
use crate::model::{AuthenticationResponse, SecretVariables};

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

#[cfg(not(feature = "debug-mock"))]
pub static ENVIRONMENT_VARIABLES: RequiredEnvironmentVariables = RequiredEnvironmentVariables {
	vault_base_url: env!("VAULT_BASE_URL"),
	vault_environment: env!("VAULT_ENVIRONMENT"),
	vault_role_id: env!("VAULT_ROLE_ID"),
	vault_secret_id: env!("VAULT_SECRET_ID"),
	sentry_environment: env!("RUST_SENTRY_ENVIRONMENT"),
	sentry_dsn: env!("RUST_SENTRY_DSN"),
};

#[cfg(not(feature = "debug-mock"))]
// Use Tokio's OnceCell to fetch secrets from Vault only once
static VAULT_CELL: OnceCell<SecretVariables> = OnceCell::const_new();

#[cfg(not(feature = "debug-mock"))]
#[tauri::command]
async fn get_secret_variables() -> Result<&'static SecretVariables, String> {
	// Fetch secrets from Vault only once, the cell functions as a cache
	VAULT_CELL
		.get_or_try_init(|| async { vault::fetch_secrets_from_vault().await })
		.await
		.map_err(|e| {
			sentry::capture_message(
				"Client failed to fetch secrets from Vault",
				sentry::Level::Error,
			);
			sentry::capture_error(&e);
			e.to_string()
		})
}

#[cfg(feature = "debug-mock")]
async fn get_secret_variables() -> Result<&'static SecretVariables, String> {
	#[tauri::command]
	MOCK_SECRETS
		.get_or_try_init(|| async {
			Ok(SecretVariables {
				oidc_client_id: env!("OIDC_CLIENT_ID").to_string(),
				oidc_client_secret: env!("OIDC_CLIENT_SECRET").to_string(),
				oidc_base_url: env!("OIDC_BASE_URL").to_string(),
				oidc_tekst_client_id: env!("OIDC_TEKST_CLIENT_ID").to_string(),
				oidc_tekst_client_secret: env!("OIDC_TEKST_CLIENT_SECRET").to_string(),
				oidc_tekst_base_url: env!("OIDC_TEKST_BASE_URL").to_string(),
			})
		})
		.await
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
async fn ensure_all_previews_and_thumbnails(directory_path: String) -> Result<(), String> {
	let image_files =
		file_utils::list_image_files(&directory_path, true).map_err(|e| e.to_string())?;
	for file_path in image_files {
		let file_path_str = file_path.to_string_lossy().to_string();
		if !image_converter::check_if_preview_exists(&file_path_str).unwrap_or(false) {
			image_converter::convert_to_webp(file_path_str.clone(), true).ok();
		}
		if !image_converter::check_if_thumbnail_exists(&file_path_str).unwrap_or(false) {
			image_converter::convert_to_webp(file_path_str, false).ok();
		}
	}
	Ok(())
}

#[tauri::command]
async fn create_thumbnail_webp(file_path: String) -> Result<(), String> {
	match image_converter::check_if_thumbnail_exists(&file_path) {
		Ok(exists) => {
			if exists {
				return Ok(());
			}
		}
		Err(e) => {
			e.to_string();
		}
	}

	match image_converter::convert_to_webp(file_path, false) {
		Ok(_) => Ok(()),
		Err(e) => Err(e.to_string()),
	}
}

#[tauri::command]
async fn create_preview_webp(file_path: String) -> Result<(), String> {
	match image_converter::check_if_preview_exists(&file_path) {
		Ok(exists) => {
			if exists {
				return Ok(());
			}
		}
		Err(e) => {
			e.to_string();
		}
	}

	match image_converter::convert_to_webp(file_path, true) {
		Ok(_) => Ok(()),
		Err(e) => Err(e.to_string()),
	}
}

static CURRENT_DIRECTORIES_PROCESSING: Lazy<Mutex<Vec<String>>> =
	Lazy::new(|| Mutex::new(Vec::new()));
const VERSION_CHECK_TIMEOUT_MS: u64 = 5_000;

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

#[cfg(not(feature = "debug-mock"))]
#[tauri::command]
async fn get_papi_access_token() -> Result<String, String> {
	auth::get_access_token_for_papi().await
}

#[cfg(not(feature = "debug-mock"))]
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
async fn upload_batch_to_s3(
	batch_map: HashMap<String, Vec<String>>,
	material_type: &str,
	app_window: tauri::Window,
) -> Result<usize, String> {
	s3::upload_batch_to_s3(batch_map, material_type, app_window).await
}

#[tauri::command]
async fn rotate_image(file_path: String, direction: String) -> Result<(), String> {
	tokio::task::spawn_blocking(move || image_converter::rotate_image(file_path, &direction))
		.await
		.expect("Failed to run blocking task")
		.map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_all_previews_and_thumbnails(directory_path: String) -> Result<u32, String> {
	tokio::task::spawn_blocking(move || {
		file_utils::delete_all_previews_and_thumbnails(directory_path)
	})
	.await
	.expect("Failed to run blocking task")
	.map_err(|e| e.to_string())
}

#[tauri::command]
async fn set_image_size_fractions(
	thumbnail_fraction: u32,
	preview_fraction: u32,
) -> Result<(), String> {
	image_converter::set_image_size_fractions(thumbnail_fraction, preview_fraction)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
	tauri::async_runtime::set(tokio::runtime::Handle::current());
	tauri::Builder::default()
		/*.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
			let _ = app
				.get_webview_window("main")
				.expect("no main window")
				.set_focus();
		}))*/
		.plugin(tauri_plugin_window_state::Builder::default().build())
		.plugin(tauri_plugin_store::Builder::new().build())
		.plugin(tauri_plugin_http::init())
		.plugin(tauri_plugin_process::init())
		.plugin(tauri_plugin_dialog::init())
		.plugin(tauri_plugin_store::Builder::default().build())
		.plugin(tauri_plugin_fs::init())
		.plugin(tauri_plugin_oauth::init())
		.setup(|app| {
			//app.get_webview_window("main").unwrap().open_devtools();
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
			create_thumbnail_webp,
			ensure_all_previews_and_thumbnails,
			create_preview_webp,
			convert_directory_to_webp,
			pick_directory,
			rotate_image,
			delete_all_previews_and_thumbnails,
			set_image_size_fractions,
			#[cfg(not(feature = "debug-mock"))]
			get_papi_access_token,
			#[cfg(not(feature = "debug-mock"))]
			upload_directory_to_s3,
			#[cfg(not(feature = "debug-mock"))]
			upload_batch_to_s3,
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
