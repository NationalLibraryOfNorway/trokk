extern crate fs_extra;

use std::fs;
use std::fs::create_dir;
use std::path::Path;

use fs_extra::dir::CopyOptions;

pub(crate) fn move_dir(old_dir: String, done_dir: String, new_name: String) -> Result<(), String> {
	let old_path = Path::new(&old_dir);
	let done_path = Path::new(&done_dir);

	// Create the new directory with new name
	let new_dir_binding = done_path.join(new_name);
	let new_dir = Path::new(&new_dir_binding);
	match create_dir(new_dir) {
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
	// but moves content and delete old dir since we want to use id as name
	let mut options = CopyOptions::new();
	options.content_only = true;

	match fs_extra::dir::move_dir(old_path, new_dir, &options) {
		Ok(_) => Ok(()),
		Err(e) => Err(e.to_string()),
	}
}
