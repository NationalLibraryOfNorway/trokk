use std::error;
use std::fs::DirBuilder;
use std::path::{Path, PathBuf};

use tauri::test;
use tempfile::TempDir;

use crate::tests::test_utils::get_test_resource_dir;
use crate::{copy_dir, delete_dir, get_total_size_of_files_in_folder};

#[test]
fn test_get_total_size_of_files_in_folder_returns_correct_total_size(
) -> Result<(), Box<dyn error::Error>> {
	let binding = get_test_resource_dir();
	let img_path = binding.to_str().unwrap();
	let actual_size = get_total_size_of_files_in_folder(img_path);
	let expected_size = 11175;

	match actual_size {
		Ok(size) => assert_eq!(size, expected_size),
		Err(_) => panic!("Failed to get size of file"),
	}
	Ok(())
}

#[tokio::test]
async fn test_copy_dir_should_copy_old_dir_with_contents_and_give_it_new_name(
) -> Result<(), Box<dyn error::Error>> {
	let app_handle = test::mock_app().handle();
	let base_path = TempDir::with_prefix("trokk-test-copy-tmp-")?;

	let old_dir = base_path.path().join("dagbladet");
	DirBuilder::new().create(&old_dir)?;

	let file1_path = old_dir.join("file1.txt");
	let file2_path = old_dir.join("file2.txt");
	std::fs::File::create(file1_path)?;
	std::fs::File::create(file2_path)?;
	let subdir = old_dir.join("subdir");
	DirBuilder::new().create(&subdir)?;

	let done_dir = base_path.path().join("done");
	DirBuilder::new().create(&done_dir)?;

	let copied_dir_str = copy_dir(
		old_dir.to_str().unwrap(),
		done_dir.to_str().unwrap(),
		"the_new_folder_name",
		app_handle,
	)
	.await;

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
	Ok(())
}

#[tokio::test]
async fn test_delete_dir_should_delete_directory() -> Result<(), Box<dyn error::Error>> {
	let dir = TempDir::with_prefix("trokk-test-delete-tmp-")?;
	let dir_name = dir.path().to_str().unwrap();

	assert!(Path::new(dir_name).exists());

	let delete_dir_result = delete_dir(dir_name).await;

	match delete_dir_result {
		Ok(_) => {
			let dir_path = Path::new(dir_name);
			assert!(!dir_path.exists());
		}
		Err(_) => panic!("Failed to delete directory"),
	}
	Ok(())
}
