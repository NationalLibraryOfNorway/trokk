// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::ffi::OsString;
use std::sync::Mutex;

use gethostname::gethostname;
use once_cell::sync::Lazy;
use tauri::Manager;
use tauri::Window;

#[cfg(debug_assertions)]
use crate::image_converter::ConversionCount;
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

static THREAD_POOL: Lazy<rayon::ThreadPool> = Lazy::new(|| {
	rayon::ThreadPoolBuilder::new()
		.num_threads(4)
		.build()
		.unwrap()
});

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
	println!("MAIN: Logging in");
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

static CURRENT_DIRECTORIES_PROCESSING: Lazy<Mutex<Vec<String>>> =
	Lazy::new(|| Mutex::new(Vec::new()));

#[tauri::command]
async fn convert_directory_to_webp(directory_path: String) -> Result<ConversionCount, String> {
	println!("MAIN: Converting directory to webp: {:?}", &directory_path);

	{
		// Lock the Mutex to safely access the shared state
		let mut directories = CURRENT_DIRECTORIES_PROCESSING.lock().unwrap();
		println!("Directories being processed: {:?}", &directories);
		if directories.contains(&directory_path) {
			println!(
				"MAIN: Directory already being processed: {:?}",
				directory_path
			);
			return Ok(ConversionCount {
				converted: 0,
				already_converted: 0,
			});
		}

		directories.push(directory_path.clone());
		drop(directories);
	}
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
}

/*const CURRENT_DIRECTORIES_PROCESSING: Lazy<Arc<Mutex<Vec<String>>>> =
	Lazy::new(|| Arc::new(Mutex::new(Vec::new())));

#[tauri::command]
async fn convert_directory_to_webp(directory_path: String) -> Result<(), String> {
	println!("MAIN: Converting directory to webp: {:?}", directory_path);
	let inputs_clone = Arc::clone(&CURRENT_DIRECTORIES_PROCESSING);
	let mut directories_processing = inputs_clone.lock().unwrap();
	// print directories being processed
	println!("Directories being processed: {:?}", directories_processing);
	if !directories_processing.contains(&directory_path) {
		directories_processing.push(directory_path.clone());
		drop(directories_processing); // Release the lock
		THREAD_POOL.install(|| {
			rayon::scope(|s| {
				s.spawn(move |_| {
					println!(
						"S:SPAWN: Converting directory to webp: {:?}",
						directory_path
					);
					image_converter::convert_directory_to_webp(directory_path.clone())
						.expect("Could not convert directory to webp");
					let mut directories_processing = inputs_clone.lock().unwrap();
					directories_processing.retain(|dir| dir != &directory_path); // Remove the directory from the list after processing
				});
			});
		})
	} else {
		println!(
			"MAIN: Directory already being processed: {:?}",
			directory_path
		);
	}
	Ok(())
}*/

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

#[tokio::main]
async fn main() {
	tauri::async_runtime::set(tokio::runtime::Handle::current());
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
			convert_directory_to_webp,
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
