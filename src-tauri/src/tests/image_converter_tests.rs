use std::ffi::OsStr;
use std::fs;
use std::path::PathBuf;

use ::tempfile::TempDir;

use crate::image_converter::*;
use crate::tests::test_utils::TEST_IMAGE_PNG;
use crate::tests::test_utils::get_test_resource_dir;

fn setup_temp_dir<F: FnMut(PathBuf)>(mut handler: F) {
	let input_image_path = get_test_resource_dir().join(TEST_IMAGE_PNG);

	let tmp_dir = TempDir::with_prefix("trokk-test-tmp-").expect("Failed to create temp dir");
	let tmp_img_path = tmp_dir.path().join(TEST_IMAGE_PNG);

	fs::copy(&input_image_path, &tmp_img_path).expect("Failed to copy test image to temp dir");

	handler(tmp_img_path);
}

#[test]
fn test_convert_to_webp_creates_webp_of_original_in_thumbnails_directory() {
	setup_temp_dir(|tmp_img_path| {
		let output_image_path = convert_to_webp(tmp_img_path, false).unwrap();

		assert!(output_image_path.exists());
		assert!(output_image_path.is_file());
		assert_eq!(output_image_path.extension().unwrap(), OsStr::new("webp"));
	});
}

#[test]
fn test_check_if_webp_exists_returns_false_if_webp_doesnt_exist() {
	setup_temp_dir(|tmp_img_path| {
		let webp_exists = check_if_thumbnail_exists(tmp_img_path).unwrap();

		assert!(!webp_exists);
	});
}

#[test]
fn test_check_if_webp_exists_returns_true_if_webp_exists() {
	setup_temp_dir(|tmp_img_path| {
		convert_to_webp(tmp_img_path.clone(), false).unwrap();

		let webp_exists = check_if_thumbnail_exists(tmp_img_path).unwrap();

		assert!(webp_exists);
	});
}
