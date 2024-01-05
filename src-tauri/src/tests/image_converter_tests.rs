#[cfg(test)]
mod image_converter_tests {
    use std::path::PathBuf;
    use crate::image_converter::convert_to_webp;
    // use crate::test_utils::get_test_resource_path;

    pub trait FileSystemWriteTrait {
        fn write(&self, path: &PathBuf, content: &str) -> std::io::Result<()>;
    }

    #[test]
    fn test_convert_to_webp() {
        let mut path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        path.push("tests/resources");

        // let test_resources_path = get_test_resource_path("tests/resources");
        let input_image_path = path.join("test_image_1.png");
        print!("\n\n{:?}\n\n", input_image_path);
        let output_image_path = convert_to_webp(input_image_path).unwrap();

        assert!(output_image_path.exists());

    }
}
