#[cfg(test)]
mod tests {
    use std::fs::{self, File};
    use std::path::PathBuf;
    use crate::file_utils::{delete_dir, find_all_images, get_file_paths_in_directory};

    fn get_test_dir() -> PathBuf {
        let mut path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        path.push("src/tests/resources");
        path
    }

    fn setup_test_folder(name: &str) -> PathBuf {
        let test_root = get_test_dir().join(name);
        let _ = fs::remove_dir_all(&test_root); // Clean before
        fs::create_dir_all(&test_root).expect("Failed to create test directory");
        test_root
    }

    fn create_file(path: &PathBuf) {
        File::create(path).expect("Failed to create test file");
    }

    #[test]
    fn test_delete_dir_success() {
        let test_dir = setup_test_folder("delete_test");
        let result = delete_dir(test_dir.to_str().unwrap());
        assert!(result.is_ok());
        assert!(!test_dir.exists());
    }

    #[test]
    fn test_delete_dir_failure() {
        let result = delete_dir("non_existent_dir_hopefully");
        assert!(result.is_err());
    }

    #[test]
    #[cfg(not(feature = "debug-mock"))]
    fn test_get_file_paths_in_directory() {
        let test_dir = setup_test_folder("file_list_test");
        let file1 = test_dir.join("a.txt");
        let file2 = test_dir.join("b.txt");
        create_file(&file1);
        create_file(&file2);

        let result = get_file_paths_in_directory(test_dir.to_str().unwrap()).unwrap();
        let filenames: Vec<String> = result
            .into_iter()
            .map(|p| p.file_name().unwrap().to_string_lossy().to_string())
            .collect();

        assert_eq!(filenames, vec!["a.txt", "b.txt"]);
    }

    #[test]
    fn test_find_all_images() {
        let test_dir = setup_test_folder("image_test");
        let image1 = test_dir.join("image1.jpg");
        let image2 = test_dir.join("image2.png");
        let not_image = test_dir.join("note.txt");
        create_file(&image1);
        create_file(&image2);
        create_file(&not_image);

        let result = find_all_images(test_dir.to_str().unwrap()).unwrap();
        let files: Vec<String> = result
            .iter()
            .map(|p| PathBuf::from(p).file_name().unwrap().to_string_lossy().to_string())
            .collect();

        assert!(files.contains(&"image1.jpg".to_string()));
        assert!(files.contains(&"image2.png".to_string()));
        assert!(!files.contains(&"note.txt".to_string()));
    }
}
