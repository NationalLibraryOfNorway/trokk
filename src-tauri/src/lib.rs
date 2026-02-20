use gethostname::gethostname;
use once_cell::sync::Lazy;
#[cfg(not(feature = "debug-mock"))]
use reqwest::Client;
#[cfg(not(feature = "debug-mock"))]
use std::cmp::Ordering;
use std::collections::HashMap;
use std::ffi::OsString;
use std::string::ToString;
use std::sync::Mutex;
#[cfg(not(feature = "debug-mock"))]
use std::time::Duration;
use tauri::Window;
use tokio::sync::OnceCell;

use crate::image_converter::ConversionCount;
#[cfg(not(feature = "debug-mock"))]
use crate::model::RequiredEnvironmentVariables;
use crate::model::{
	AuthenticationResponse, DesktopVersionGateResponse, SecretVariables, StartupVersionStatus,
};

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
#[cfg(feature = "debug-mock")]
static MOCK_SECRET_CELL: OnceCell<SecretVariables> = OnceCell::const_new();

#[cfg(not(feature = "debug-mock"))]
pub(crate) async fn get_cached_secret_variables() -> Result<&'static SecretVariables, String> {
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
pub(crate) async fn get_cached_secret_variables() -> Result<&'static SecretVariables, String> {
	MOCK_SECRET_CELL
		.get_or_try_init(|| async {
			Ok(SecretVariables {
				oidc_client_id: option_env!("OIDC_CLIENT_ID").unwrap_or("").to_string(),
				oidc_client_secret: option_env!("OIDC_CLIENT_SECRET").unwrap_or("").to_string(),
				oidc_base_url: option_env!("OIDC_BASE_URL").unwrap_or("").to_string(),
				oidc_tekst_client_id: option_env!("OIDC_TEKST_CLIENT_ID")
					.unwrap_or("")
					.to_string(),
				oidc_tekst_client_secret: option_env!("OIDC_TEKST_CLIENT_SECRET")
					.unwrap_or("")
					.to_string(),
				oidc_tekst_base_url: option_env!("OIDC_TEKST_BASE_URL").unwrap_or("").to_string(),
			})
		})
		.await
}

#[cfg(not(feature = "debug-mock"))]
#[derive(Clone, Copy)]
struct ParsedVersion {
	major: u64,
	minor: u64,
	patch: u64,
}

#[cfg(not(feature = "debug-mock"))]
fn parse_version(input: &str) -> Result<ParsedVersion, String> {
	let invalid_format = || format!("Ugyldig versjonsformat: {input}");
	let trimmed = input.trim().trim_start_matches(['v', 'V']);

	let (major_part, rest) = trimmed.split_once('.').ok_or_else(invalid_format)?;
	let (minor_part, patch_part) = rest.split_once('.').ok_or_else(invalid_format)?;

	// Exactly three numeric parts are supported.
	if patch_part.contains('.') {
		return Err(invalid_format());
	}
	if patch_part.contains('-') || patch_part.contains('+') {
		return Err(format!(
			"Ugyldig versjonsformat: {input}. Appended informasjon støttes ikke."
		));
	}

	let parse_number = |part: &str| part.parse::<u64>().map_err(|_| invalid_format());
	Ok(ParsedVersion {
		major: parse_number(major_part)?,
		minor: parse_number(minor_part)?,
		patch: parse_number(patch_part)?,
	})
}

#[cfg(not(feature = "debug-mock"))]
fn compare_versions(a: ParsedVersion, b: ParsedVersion) -> Ordering {
	a.major
		.cmp(&b.major)
		.then(a.minor.cmp(&b.minor))
		.then(a.patch.cmp(&b.patch))
}

#[cfg(not(feature = "debug-mock"))]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum VersionDelta {
	UpToDate,
	Patch,
	Minor,
	Major,
}

#[cfg(not(feature = "debug-mock"))]
#[derive(Debug, PartialEq, Eq)]
struct VersionEvaluation {
	delta: VersionDelta,
	status: StartupVersionStatus,
	current_version_text: String,
	latest_version_text: String,
}

#[cfg(not(feature = "debug-mock"))]
fn evaluate_version(
	current_version: &str,
	latest_version: &str,
) -> Result<VersionEvaluation, String> {
	let current_version_text = format!("v{current_version}");
	let current = parse_version(current_version)
		.map_err(|e| format!("{e} (nåværende versjon: {current_version_text})"))?;
	let latest_version_text = latest_version.to_string();
	let latest = parse_version(latest_version).map_err(|e| {
		format!(
			"{e} (nåværende versjon: {current_version_text}, mottatt siste versjon: {latest_version_text})"
		)
	})?;

	let (delta, status) = if compare_versions(current, latest) != Ordering::Less {
		(VersionDelta::UpToDate, StartupVersionStatus::UpToDate)
	} else if current.major != latest.major {
		(VersionDelta::Major, StartupVersionStatus::MajorBlocking)
	} else if current.minor != latest.minor {
		(VersionDelta::Minor, StartupVersionStatus::MinorBlocking)
	} else {
		(VersionDelta::Patch, StartupVersionStatus::PatchAvailable)
	};

	Ok(VersionEvaluation {
		delta,
		status,
		current_version_text,
		latest_version_text,
	})
}

#[cfg(not(feature = "debug-mock"))]
pub(crate) fn evaluate_desktop_version_gate(
	current_version: &str,
	latest_version: &str,
) -> Result<DesktopVersionGateResponse, String> {
	let evaluation = evaluate_version(current_version, latest_version)?;
	let blocking_message = |version_label: &str| {
		format!(
			"Ny {version_label} er tilgjengelig ({}). Nåværende versjon: {}. Oppdater appen før du kan TRØKKE.",
			evaluation.latest_version_text, evaluation.current_version_text
		)
	};

	let (message, is_blocking, is_patch) = match evaluation.delta {
		VersionDelta::UpToDate => (None, false, false),
		VersionDelta::Major => (Some(blocking_message("hovedversjon")), true, false),
		VersionDelta::Minor => (Some(blocking_message("delversjon")), true, false),
		VersionDelta::Patch => (
			Some(format!(
				"Ny patch-versjon er tilgjengelig ({}). Du kan fortsette, men det anbefales å oppdatere.",
				evaluation.latest_version_text
			)),
			false,
			true,
		),
	};

	Ok(DesktopVersionGateResponse {
		status: evaluation.status,
		is_blocking,
		is_patch,
		message,
		current_version: evaluation.current_version_text,
		latest_version: Some(evaluation.latest_version_text),
	})
}

#[cfg(not(feature = "debug-mock"))]
async fn fetch_latest_desktop_version(desktop_version_base_uri: &str) -> Result<String, String> {
	let desktop_version_uri = format!(
		"{}/Tr%C3%B8kk",
		desktop_version_base_uri.trim_end_matches('/')
	);
	let client = Client::builder()
		.timeout(Duration::from_secs(15))
		.build()
		.map_err(|e| format!("Kunne ikke initialisere HTTP-klient: {e}"))?;
	let response = client
		.get(&desktop_version_uri)
		.send()
		.await
		.map_err(|e| format!("Kunne ikke hente siste versjon: {e}"))?;
	if !response.status().is_success() {
		return Err(format!(
			"Kunne ikke hente siste versjon. Status: {}",
			response.status()
		));
	}
	response
		.text()
		.await
		.map_err(|e| format!("Kunne ikke lese versjonssvar: {e}"))
		.map(|raw| raw.trim().trim_matches('"').trim().to_string())
		.and_then(|normalized| {
			(!normalized.is_empty())
				.then_some(normalized)
				.ok_or_else(|| "Versjonssvar var tomt.".to_string())
		})
}

#[cfg(not(feature = "debug-mock"))]
#[tauri::command]
async fn get_secret_variables() -> Result<SecretVariables, String> {
	let cached = get_cached_secret_variables().await?;
	Ok(cached.clone())
}

#[cfg(not(feature = "debug-mock"))]
#[tauri::command]
async fn check_desktop_version_gate(
	desktop_version_uri: String,
) -> Result<DesktopVersionGateResponse, String> {
	let version_uri = desktop_version_uri.trim();
	if version_uri.is_empty() {
		return Err(
			"Mangler konfigurasjon for versjonssjekk (VITE_PAPI_API_DESKTOP_VERSION_URI)."
				.to_string(),
		);
	}

	let current_version = env!("CARGO_PKG_VERSION").to_string();
	let current_version_text = format!("v{current_version}");
	let latest_version = fetch_latest_desktop_version(version_uri)
		.await
		.map_err(|e| format!("{e} (nåværende versjon: {current_version_text})"))?;
	let response = evaluate_desktop_version_gate(&current_version, &latest_version)?;

	Ok(response)
}

#[cfg(feature = "debug-mock")]
#[tauri::command]
async fn get_secret_variables() -> Result<SecretVariables, String> {
	let cached = get_cached_secret_variables().await?;
	Ok(cached.clone())
}

#[cfg(feature = "debug-mock")]
#[tauri::command]
async fn check_desktop_version_gate(
	_desktop_version_uri: String,
) -> Result<DesktopVersionGateResponse, String> {
	Ok(DesktopVersionGateResponse {
		status: StartupVersionStatus::UpToDate,
		is_blocking: false,
		is_patch: false,
		message: None,
		current_version: format!("v{}", env!("CARGO_PKG_VERSION")),
		latest_version: Some(format!("v{}", env!("CARGO_PKG_VERSION"))),
	})
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
			check_desktop_version_gate,
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
