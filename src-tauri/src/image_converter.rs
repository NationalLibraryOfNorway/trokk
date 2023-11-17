use image::io::Reader as ImageReader;
use webp::{Encoder, WebPMemory};
use std::error::Error;
use std::fs;
use std::path::{Path, PathBuf};

pub fn convert_to_webp<P: AsRef<Path>>(
    image_path: P,
) -> Result<PathBuf, Box<dyn Error + Send + Sync + 'static>> {
    let path_reference = image_path.as_ref();
    let image = ImageReader::open(path_reference)?
        .with_guessed_format()?
        .decode()?;

    let encoder: Encoder = Encoder::from_image(&image)?;
    let encoded_webp: WebPMemory = encoder
        .encode_simple(false,2.50)
        .expect("Failed to encode image");

    let parent_directory = path_reference.parent().unwrap();
    let filename_original_image = path_reference.file_name().unwrap();

    let mut path = parent_directory.to_owned();
    path.push("thumbnails");
    fs::create_dir_all(&path)?;
    path.push(filename_original_image);
    path.set_extension("webp");
    fs::write(&path, &*encoded_webp)?;

    Ok(path)
}