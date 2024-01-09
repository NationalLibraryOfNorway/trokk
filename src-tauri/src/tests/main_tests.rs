use std::fs::DirBuilder;
use std::path::{Path, PathBuf};

use tempfile::TempDir;

use crate::tests::test_utils::get_test_resource_dir;
use crate::{copy_dir, delete_dir, get_total_size_of_files_in_folder};

#[test]
fn test_get_total_size_of_files_in_folder_returns_correct_total_size() {
	let img_path = get_test_resource_dir()
		.to_str()
		.expect("Failed to get path")
		.to_string();
	let actual_size = get_total_size_of_files_in_folder(img_path);
	let expected_size = 11175;

	match actual_size {
		Ok(size) => assert_eq!(size, expected_size),
		Err(_) => panic!("Failed to get size of file"),
	}
}

#[test]
fn test_copy_dir_should_copy_old_dir_with_contents_and_give_it_new_name() {
	let base_path =
		TempDir::with_prefix("trokk-test-copy-tmp-").expect("Failed to create temp directory");

	let old_dir = base_path.path().join("dagbladet");
	DirBuilder::new()
		.create(&old_dir)
		.expect("Failed to create old directory");

	let file1_path = old_dir.join("file1.txt");
	let file2_path = old_dir.join("file2.txt");
	std::fs::File::create(file1_path).expect("Failed to create file");
	std::fs::File::create(file2_path).expect("Failed to create file");
	let subdir = old_dir.join("subdir");
	DirBuilder::new()
		.create(&subdir)
		.expect("Failed to create subdir");

	let done_dir = base_path.path().join("done");
	DirBuilder::new()
		.create(&done_dir)
		.expect("Failed to create new directory");

	let copied_dir_str = copy_dir(
		old_dir.to_str().expect("").to_string(),
		done_dir.to_str().expect("").to_string(),
		"the_new_folder_name".to_string(),
	);

	match copied_dir_str {
		Ok(copied_dir) => {
			let new_dir = PathBuf::from(copied_dir);
			assert!(new_dir.exists());
			assert!(new_dir.is_dir());
			assert!(new_dir.join("file1.txt").exists());
			assert!(new_dir.join("file2.txt").exists());
			assert!(!new_dir.join("subdir").exists());
		}
		Err(e) => panic!("Failed to copy directory: {:?}", e),
	}
}

#[test]
fn test_delete_dir_should_delete_directory() {
	let dir =
		TempDir::with_prefix("trokk-test-delete-tmp-").expect("Failed to create temp directory");
	let dir_name = dir.path().to_str().expect("Failed to get path").to_string();

	assert!(Path::new(&dir_name).exists());

	let delete_dir_result = delete_dir(dir_name.clone());

	match delete_dir_result {
		Ok(_) => {
			let dir_path = Path::new(&dir_name);
			assert!(!dir_path.exists());
		}
		Err(_) => panic!("Failed to delete directory"),
	}
}
