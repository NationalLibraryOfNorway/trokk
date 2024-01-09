use std::path::PathBuf;

pub const TEST_IMAGE_1_NAME: &str = "test_image_1.png";

pub fn get_test_resource_dir() -> PathBuf {
    let mut path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path.push("src/tests/resources");
    path
}