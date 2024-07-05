use std::fs;
use std::path::{Path, PathBuf};

use tauri::api::dialog::blocking::FileDialogBuilder;
use tauri::Window;

use crate::model::TransferProgress;

pub fn get_file_size(path: &str) -> Result<u64, String> {
	let mut size = 0;
	for dir_entry_result in fs::read_dir(path).unwrap() {
		let dir_entry = dir_entry_result.unwrap();
		let path = dir_entry.path();
		if path.is_file() {
			size += match fs::metadata(path) {
				Ok(data) => data.len(),
				Err(e) => return Err(e.to_string()),
			};
		}
	}
	Ok(size)
}

pub(crate) fn copy_dir_contents(
	old_dir: &str,
	new_base_dir: &str,
	new_dir_name: &str,
	app_window: Window,
) -> Result<String, String> {
	let old_dir_path = Path::new(&old_dir);
	let new_base_dir_path = Path::new(&new_base_dir);

	// Create the new directory with new name
	let new_dir_binding = new_base_dir_path.join(new_dir_name);
	let new_dir_path = Path::new(&new_dir_binding);
	match fs::create_dir(new_dir_path) {
		Ok(_) => (),
		Err(e) => return Err(e.to_string()),
	}

	let file_entries: Vec<_> = fs::read_dir(old_dir_path)
		.map_err(|e| e.to_string())?
		.filter_map(|entry| {
			let entry = entry.ok()?;
			let path = entry.path();
			if path.is_file() {
				Some(path)
			} else {
				None
			}
		})
		.collect();

	let total_files = file_entries.len();

	// Walk through old folder and only copy files, not sub-directories (like .thumbnails)
	for (index, entry) in file_entries.iter().enumerate() {
		let new_file_path = new_dir_path.join(entry.file_name().unwrap());
		match fs::copy(entry, new_file_path) {
			Ok(_) => {
				app_window
					.emit(
						"transfer_progress",
						TransferProgress {
							directory: old_dir.to_string(),
							page_nr: index + 1,
							total_pages: total_files,
						},
					)
					.map_err(|e| e.to_string())?;
			}
			Err(e) => return Err(e.to_string()),
		}
	}
	Ok(new_dir_path.to_string_lossy().to_string())
}

pub(crate) fn delete_dir(dir: &str) -> Result<(), String> {
	let path = Path::new(dir);
	match fs::remove_dir_all(path) {
		Ok(_) => Ok(()),
		Err(e) => Err(e.to_string()),
	}
}

pub(crate) async fn directory_picker(start_path: &str) -> Result<String, String> {
	let start = Path::new(start_path);
	let result = FileDialogBuilder::new().set_directory(start).pick_folder();
	match result {
		None => Err("No folder was chosen".to_string()),
		_ => Ok(result.unwrap().to_string_lossy().to_string()),
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
