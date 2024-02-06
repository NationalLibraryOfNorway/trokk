use std::path::PathBuf;

pub const TEST_IMAGE_PNG: &str = "test_image.png";

pub fn get_test_resource_dir() -> PathBuf {
	let mut path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
	path.push("src/tests/resources");
	path
}
