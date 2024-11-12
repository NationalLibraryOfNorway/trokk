use std::error;
use std::path::{Path};

use tempfile::TempDir;

use crate::{delete_dir};

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
