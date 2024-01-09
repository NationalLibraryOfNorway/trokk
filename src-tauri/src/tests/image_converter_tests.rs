/**
 * TempDir can not be extracted to a function, because any files/folders created are deleted when
 * TempDir goes out of scope.
 */
use std::ffi::OsStr;
use std::fs;

use ::tempfile::TempDir;

use crate::image_converter::*;
use crate::tests::test_utils::get_test_resource_dir;
use crate::tests::test_utils::TEST_IMAGE_1_NAME;

#[test]
fn test_convert_to_webp_creates_webp_of_original_in_thumbnails_directory() {
	let input_image_path = get_test_resource_dir().join(TEST_IMAGE_1_NAME);

	let tmp_dir = TempDir::with_prefix("trokk-test-tmp-").expect("Failed to create temp directory");
	let tmp_img_path = tmp_dir.path().join(TEST_IMAGE_1_NAME);

	fs::copy(&input_image_path, &tmp_img_path).expect("Failed to copy image to temp directory");

	let output_image_path = convert_to_webp(tmp_img_path).expect("Failed to convert image to webp");

	assert!(output_image_path.exists());
	assert!(output_image_path.is_file());
	assert_eq!(output_image_path.extension().unwrap(), OsStr::new("webp"));
}

#[test]
fn test_check_if_webp_exists_returns_false_if_webp_doesnt_exist() {
	let input_image_path = get_test_resource_dir().join(TEST_IMAGE_1_NAME);

	let tmp_dir = TempDir::with_prefix("trokk-test-tmp-").expect("Failed to create temp directory");
	let tmp_img_path = tmp_dir.path().join(TEST_IMAGE_1_NAME);

	fs::copy(&input_image_path, &tmp_img_path).expect("Failed to copy image to temp directory");

	let webp_exists = check_if_webp_exists(tmp_img_path).unwrap();

	assert!(!webp_exists);
}

#[test]
fn test_check_if_webp_exists_returns_true_if_webp_exists() {
	let input_image_path = get_test_resource_dir().join(TEST_IMAGE_1_NAME);

	let tmp_dir = TempDir::with_prefix("trokk-test-tmp-").expect("Failed to create temp directory");
	let tmp_img_path = tmp_dir.path().join(TEST_IMAGE_1_NAME);

	fs::copy(&input_image_path, &tmp_img_path).expect("Failed to copy image to temp directory");

	convert_to_webp(tmp_img_path.clone()).expect("Failed to convert image to webp");

	let webp_exists = check_if_webp_exists(tmp_img_path).unwrap();

	assert!(webp_exists);
}
