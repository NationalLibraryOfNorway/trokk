use std::ffi::OsStr;
use std::fs;
use std::path::{Path, PathBuf};

use tauri_plugin_dialog::DialogExt;

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

/// Lists image files in a directory
/// Supports: tif, tiff, jpg, jpeg, png, webp
///
/// # Arguments
/// * `directory_path` - The directory to search
/// * `recursive` - If true, searches subdirectories recursively
pub fn list_image_files<P: AsRef<Path>>(
	directory_path: P,
	recursive: bool,
) -> Result<Vec<PathBuf>, std::io::Error> {
	const IMAGE_EXTENSIONS: &[&str] = &["tif", "tiff", "jpg", "jpeg", "png", "webp"];

	let mut files = Vec::new();

	fn visit_dirs(
		dir: &Path,
		recursive: bool,
		files: &mut Vec<PathBuf>,
	) -> Result<(), std::io::Error> {
		for entry in fs::read_dir(dir)? {
			let entry = entry?;
			let path = entry.path();
			if path.is_dir() {
				if recursive {
					visit_dirs(&path, recursive, files)?;
				}
			} else if path.is_file()
				&& let Some(ext) = path.extension().and_then(|e| e.to_str())
					&& IMAGE_EXTENSIONS
						.iter()
						.any(|&x| x.eq_ignore_ascii_case(ext))
					{
						files.push(path);
					}
		}
		Ok(())
	}

	visit_dirs(directory_path.as_ref(), recursive, &mut files)?;
	files.sort();
	Ok(files)
}

pub fn directory_exists<P: AsRef<Path>>(path: P) -> bool {
	fs::metadata(path)
		.map(|metadata| metadata.is_dir())
		.unwrap_or(false)
}

pub fn get_parent_directory(path_reference: &Path) -> Result<&Path, String> {
	path_reference.parent().ok_or_else(|| {
		format!(
			"Failed to get parent directory for: {:?}",
			path_reference.to_str()
		)
	})
}

pub fn get_file_name(path_reference: &Path) -> Result<&OsStr, String> {
	path_reference
		.file_name()
		.ok_or_else(|| format!("Failed to get file name for: {:?}", path_reference.to_str()))
}

/// Deletes all .previews folders recursively in a directory
/// Returns the number of preview folders deleted
pub fn delete_all_previews_and_thumbnails<P: AsRef<Path>>(
	directory_path: P,
) -> Result<u32, std::io::Error> {
	const PREVIEW_FOLDER_NAME: &str = ".previews";
	const THUMBNAIL_FOLDER_NAME: &str = ".thumbnails";

	let path_reference = directory_path.as_ref();
	let mut deleted_count = 0;

	// Recursively walk through all directories
	fn walk_and_delete(dir: &Path, count: &mut u32) -> Result<(), std::io::Error> {
		for entry in fs::read_dir(dir)? {
			let entry = entry?;
			let path = entry.path();

			if path.is_dir() {
				let dir_name = path.file_name().and_then(|n| n.to_str());

				// If this is a .previews folder, delete it
				if dir_name == Some(PREVIEW_FOLDER_NAME) || dir_name == Some(THUMBNAIL_FOLDER_NAME)
				{
					fs::remove_dir_all(&path)?;
					*count += 1;
				} else if dir_name != Some(THUMBNAIL_FOLDER_NAME)
					|| dir_name != Some(PREVIEW_FOLDER_NAME)
				{
					// Don't recurse into .thumbnails or .previews folders, but do recurse into other directories
					walk_and_delete(&path, count)?;
				}
			}
		}
		Ok(())
	}

	walk_and_delete(path_reference, &mut deleted_count)?;
	Ok(deleted_count)
}
