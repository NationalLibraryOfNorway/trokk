use std::fs;
use std::path::Path;

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
	old_dir: String,
	new_base_dir: String,
	new_dir_name: String
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

	// Walk through old folder and only copy files, not sub-directories (like .thumbnails)
	for entry in fs::read_dir(old_dir_path).map_err(|e| e.to_string())? {
		let old_entry = entry.map_err(|e| e.to_string())?;
		let old_file_path = old_entry.path();

		if old_file_path.is_file() {
			let new_file_path = new_dir_path.join(old_entry.file_name());
			match fs::copy(old_file_path, new_file_path) {
				Ok(_) => (),
				Err(e) => return Err(e.to_string())
			}
		}
	}
	Ok(new_dir_path.to_string_lossy().to_string())
}

pub(crate) fn delete_dir(
	dir: String
) -> Result<(), String>{
	let path = Path::new(&dir);
	match fs::remove_dir_all(path) {
		Ok(_) => Ok(()),
		Err(e) => Err(e.to_string())
	}
}
