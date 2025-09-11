use std::fs;
use std::path::Path;

#[cfg(not(feature = "debug-mock"))]
use std::path::PathBuf;

use tauri_plugin_dialog::DialogExt;

pub(crate) fn delete_dir(dir: &str) -> Result<(), String> {
	let path = Path::new(dir);
	match fs::remove_dir_all(path) {
		Ok(_) => Ok(()),
		Err(e) => Err(e.to_string()),
	}
}

pub(crate) fn delete_image(file_name: &str) -> Result<String, String> {
	let file_path = Path::new(file_name);

	if file_path.exists() {
		fs::remove_file(&file_path).map_err(|e| e.to_string())?;
		println!("Deleted {:?}", file_path);
		Ok(format!("Deleted {:?}", file_path))
	} else {
		println!("File not found: {:?}", file_path);
		Err(format!("File not found: {:?}", file_path))
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
#[cfg(not(feature = "debug-mock"))]
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

pub fn find_all_images(directory: &str) -> Result<Vec<String>, String> {
	let mut images = Vec::new();
	let endings = ["tif", "tiff", "jpg", "jpeg", "png"];

	fn visit_dirs(dir: &Path, endings: &[&str], images: &mut Vec<String>) -> Result<(), String> {
		for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
			let entry = entry.map_err(|e| e.to_string())?;
			let path = entry.path();
			if path.is_dir() {
				visit_dirs(&path, endings, images)?;
			} else if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
				if endings.iter().any(|&x| x.eq_ignore_ascii_case(ext)) {
					images.push(path.to_string_lossy().to_string());
				}
			}
		}
		Ok(())
	}

	visit_dirs(Path::new(directory), &endings, &mut images)?;
	Ok(images)
}
