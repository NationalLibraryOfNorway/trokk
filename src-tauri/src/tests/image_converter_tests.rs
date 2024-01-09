use std::error;
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
fn test_convert_to_webp_creates_webp_of_original_in_thumbnails_directory() -> Result<(), Box<dyn error::Error>> {
	let input_image_path = get_test_resource_dir().join(TEST_IMAGE_1_NAME);

	let tmp_dir = TempDir::with_prefix("trokk-test-tmp-")?;
	let tmp_img_path = tmp_dir.path().join(TEST_IMAGE_1_NAME);

	fs::copy(&input_image_path, &tmp_img_path)?;

	let output_image_path = convert_to_webp(tmp_img_path)?;

	assert!(output_image_path.exists());
	assert!(output_image_path.is_file());
	assert_eq!(output_image_path.extension().unwrap(), OsStr::new("webp"));
	Ok(())
}

#[test]
fn test_check_if_webp_exists_returns_false_if_webp_doesnt_exist() -> Result<(), Box<dyn error::Error>> {
	let input_image_path = get_test_resource_dir().join(TEST_IMAGE_1_NAME);

	let tmp_dir = TempDir::with_prefix("trokk-test-tmp-")?;
	let tmp_img_path = tmp_dir.path().join(TEST_IMAGE_1_NAME);

	fs::copy(&input_image_path, &tmp_img_path)?;

	let webp_exists = check_if_webp_exists(tmp_img_path).unwrap();

	assert!(!webp_exists);
	Ok(())
}

#[test]
fn test_check_if_webp_exists_returns_true_if_webp_exists() -> Result<(), Box<dyn error::Error>> {
	let input_image_path = get_test_resource_dir().join(TEST_IMAGE_1_NAME);

	let tmp_dir = TempDir::with_prefix("trokk-test-tmp-")?;
	let tmp_img_path = tmp_dir.path().join(TEST_IMAGE_1_NAME);

	fs::copy(&input_image_path, &tmp_img_path)?;

	convert_to_webp(tmp_img_path.clone())?;

	let webp_exists = check_if_webp_exists(tmp_img_path).unwrap();

	assert!(webp_exists);
	Ok(())
}
