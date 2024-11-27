use std::fs;
use std::path::{Path, PathBuf};

use tauri_plugin_dialog::DialogExt;

pub(crate) fn delete_dir(dir: &str) -> Result<(), String> {
	let path = Path::new(dir);
	match fs::remove_dir_all(path) {
		Ok(_) => Ok(()),
		Err(e) => Err(e.to_string()),
	}
}

pub(crate) fn directory_picker<R: tauri::Runtime, P: AsRef<Path>>(
	start_path: P,
	app_handle: tauri::AppHandle<R>,
) -> Option<String> {
	let folder_path = app_handle
		.dialog()
		.file()
		.set_directory(start_path)
		.blocking_pick_folder();
	if folder_path.is_none() {
		None
	} else {
		Some(folder_path?.to_string())
	}
}

// Get all file paths in a directory, without subdirectories
pub(crate) fn get_file_paths_in_directory(directory_path: &str) -> Result<Vec<PathBuf>, String> {
	let mut file_paths = Vec::new();
	for dir_entry_result in fs::read_dir(directory_path).map_err(|e| e.to_string())? {
		let dir_entry = dir_entry_result.map_err(|e| e.to_string())?;
		let path = dir_entry.path();
		if path.is_file() {
			file_paths.push(path);
		}
	}
	file_paths.sort_by(|a, b| a.file_name().cmp(&b.file_name()));
	Ok(file_paths)
}
