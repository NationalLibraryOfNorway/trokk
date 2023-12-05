use std::ffi::OsStr;
use std::fs;
use std::path::{Path, PathBuf};

use image::io::Reader as ImageReader;
use webp::{Encoder, WebPMemory};

use crate::error::ImageConversionError;

const THUMBNAIL_FOLDER_NAME: &str = ".thumbnails";
const WEBP_EXTENSION: &str = "webp";
const WEBP_QUALITY: f32 = 2.50;

pub fn convert_to_webp<P: AsRef<Path>>(image_path: P) -> Result<PathBuf, ImageConversionError> {
	let path_reference = image_path.as_ref();
	let image = ImageReader::open(path_reference)?
		.with_guessed_format()?
		.decode()?;

	let encoder: Encoder =
		Encoder::from_image(&image).map_err(|e| ImageConversionError::StrError(e.to_string()))?;
	let encoded_webp: WebPMemory = encoder.encode_simple(false, WEBP_QUALITY)?;

	let parent_directory = get_parent_directory(path_reference)?;
	let filename_original_image = get_file_name(path_reference)?;

	let mut path = parent_directory.to_owned();
	path.push(THUMBNAIL_FOLDER_NAME);
	fs::create_dir_all(&path)?;
	path.push(filename_original_image);
	path.set_extension(WEBP_EXTENSION);
	fs::write(&path, &*encoded_webp)?;

	Ok(path)
}

pub fn check_if_webp_exists<P: AsRef<Path>>(image_path: P) -> Result<bool, ImageConversionError> {
	let path_reference = image_path.as_ref();
	let parent_directory = get_parent_directory(path_reference)?;
	let filename_original_image = get_file_name(path_reference)?;

	let mut path = parent_directory.to_owned();
	path.push(THUMBNAIL_FOLDER_NAME);
	path.push(filename_original_image);
	path.set_extension(WEBP_EXTENSION);
	Ok(path.exists())
}

fn get_parent_directory(path_reference: &Path) -> Result<&Path, ImageConversionError> {
	return path_reference
		.parent()
		.ok_or_else(|| {
			ImageConversionError::FailedToGetParentDirectoryError(format!(
				"{:?}",
				path_reference.to_str()
			))
		})
}

fn get_file_name(path_reference: &Path) -> Result<&OsStr, ImageConversionError> {
	return path_reference
		.file_name()
		.ok_or_else(|| {
			ImageConversionError::FailedToGetFileNameError(format!("{:?}", path_reference.to_str()))
		})
}
