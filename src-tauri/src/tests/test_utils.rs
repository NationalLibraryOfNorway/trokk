use std::path::PathBuf;

#[cfg(test)]
mod tests {
	use crate::file_utils::list_image_files;
	use std::fs::File;
	use std::path::PathBuf;
	use tempfile::tempdir;

	fn create_file(path: &PathBuf) {
		File::create(path).expect("Failed to create test file");
	}

	#[test]
	fn test_list_image_files_recursive() {
		let temp = tempdir().expect("Could not create temp dir");
		let test_dir = temp.path().to_path_buf();

		let image1 = test_dir.join("image1.jpg");
		let image2 = test_dir.join("image2.png");
		create_file(&image1);
		create_file(&image2);

		let result = list_image_files(&test_dir, true).unwrap();
		let files: Vec<String> = result
			.iter()
			.map(|p| p.file_name().unwrap().to_string_lossy().to_string())
			.collect();

		assert!(files.contains(&"image1.jpg".to_string()));
		assert!(files.contains(&"image2.png".to_string()));
	}
}

pub const TEST_IMAGE_PNG: &str = "test_image.png";

pub fn get_test_resource_dir() -> PathBuf {
	let mut path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
	path.push("src/tests/resources");
	path
}
