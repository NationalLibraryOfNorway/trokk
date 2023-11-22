// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod auth;
mod model;

use crate::model::{AuthenticationResponse, RequiredEnvironmentVariables};
use gethostname::gethostname;
use once_cell::sync::Lazy;
use std::ffi::OsString;
use tauri::Manager;
use tauri::Window;

pub static ENVIRONMENT_VARIABLES: Lazy<RequiredEnvironmentVariables> =
	Lazy::new(|| RequiredEnvironmentVariables {
		papi_path: env!("PAPI_PATH").parse().unwrap(),
		oidc_base_url: env!("OIDC_BASE_URL").parse().unwrap(),
		oidc_client_id: env!("OIDC_CLIENT_ID").parse().unwrap(),
		oidc_client_secret: env!("OIDC_CLIENT_SECRET").parse().unwrap(),
	});

#[tauri::command]
fn get_hostname() -> Result<String, OsString> {
	return gethostname().into_string();
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

fn main() {
	tauri::Builder::default()
		.plugin(tauri_plugin_store::Builder::default().build())
		.setup(|app| {
			#[cfg(debug_assertions)]
			app.get_window("main").unwrap().open_devtools(); // `main` is the first window from tauri.conf.json without an explicit label
			Ok(())
		})
		.invoke_handler(tauri::generate_handler![
			get_hostname,
			get_required_env_variables,
			log_in,
			refresh_token
		])
		.run(tauri::generate_context!())
		.expect("error while running tauri application");
}
