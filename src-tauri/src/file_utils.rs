extern crate fs_extra;

use std::fs;
use std::path::Path;

use fs_extra::dir::CopyOptions;

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

pub(crate) fn move_dir(
	old_dir: String,
	new_dir: String,
	new_name: String,
) -> Result<String, String> {
	let old_path = Path::new(&old_dir);
	let done_path = Path::new(&new_dir);

	// Create the new directory with new name
	let new_dir_binding = done_path.join(new_name);
	let new_path = Path::new(&new_dir_binding);
	match fs::create_dir(new_path) {
		Ok(_) => (),
		Err(e) => return Err(e.to_string()),
	}

	// Delete thumbnails if present
	let thumbnail_path = old_path.join(".thumbnails");
	if thumbnail_path.exists() {
		match fs::remove_dir_all(thumbnail_path) {
			Ok(_) => (),
			Err(e) => return Err(e.to_string()),
		}
	}

	// Create options that does not create new dir,
	// but moves content and delete old dir since we want to use other name
	let mut options = CopyOptions::new();
	options.content_only = true;

	match fs_extra::dir::move_dir(old_path, new_path, &options) {
		Ok(_) => Ok(new_path.to_string_lossy().to_string()),
		Err(e) => Err(e.to_string()),
	}
}
