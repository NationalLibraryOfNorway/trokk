use std::path::PathBuf;

use ::tempfile::TempDir;

fn get_test_resource_path(file: &str) -> PathBuf {
	let mut input_resource_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
	input_resource_path.push("src/tests/resources");
	input_resource_path.join(file)
}

#[cfg(test)]
mod image_converter_tests {
	use std::ffi::OsStr;
	use std::fs;

	use crate::image_converter::convert_to_webp;

	use super::*;

	#[test]
	fn test_convert_to_webp_creates_webp_of_original_in_thumbnails_directory() {
		const IMAGE_NAME: &str = "test_image_1.png";
		let input_image_path = get_test_resource_path(IMAGE_NAME);

		let tmp_dir =
			TempDir::with_prefix("trokk-test-tmp-").expect("Failed to create temp directory");
		let tmp_img_path = tmp_dir.path().join(IMAGE_NAME);

		fs::copy(&input_image_path, &tmp_img_path).expect("Failed to copy image to temp directory");

		let output_image_path =
			convert_to_webp(tmp_img_path).expect("Failed to convert image to webp");

		assert!(output_image_path.exists());
		assert!(output_image_path.is_file());
		assert_eq!(output_image_path.extension().unwrap(), OsStr::new("webp"));
	}
}
