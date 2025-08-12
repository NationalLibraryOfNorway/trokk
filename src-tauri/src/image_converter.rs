use image::ImageReader;
use serde::{Deserialize, Serialize};
use std::ffi::OsStr;
use std::path::{Path, PathBuf};
use std::time::Duration;
use std::{fs, thread};
use webp::{Encoder, WebPMemory};

use crate::error::ImageConversionError;

const THUMBNAIL_FOLDER_NAME: &str = ".thumbnails";
const PREVIEW_FOLDER_NAME: &str = ".previews";
const WEBP_EXTENSION: &str = "webp";
const WEBP_QUALITY: f32 = 25.0;

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all(serialize = "camelCase"))]
pub struct ConversionCount {
	pub(crate) converted: u32,
	pub(crate) already_converted: u32,
}

pub fn convert_directory_to_webp<P: AsRef<Path>>(
	directory_path: P,
) -> Result<ConversionCount, ImageConversionError> {
	let files = list_tif_files_in_directory(directory_path)?;
	let mut count = ConversionCount {
		converted: 0,
		already_converted: 0,
	};
	for file in files {
		if check_if_thumbnail_exists(&file)? {
			count.already_converted += 1;
		} else {
			convert_to_webp(&file, false)?;
			count.converted += 1;
		}
	}
	Ok(count)
}

fn list_tif_files_in_directory<P: AsRef<Path>>(
	directory_path: P,
) -> Result<Vec<PathBuf>, ImageConversionError> {
	let mut files = Vec::new();
	for entry in fs::read_dir(directory_path)? {
		let entry = entry?;
		let path = entry.path();
		if path.is_file() && path.extension().is_some_and(|ext| ext == "tif") {
			files.push(path);
		}
	}
	files.sort();
	Ok(files)
}

fn directory_exists<P: AsRef<Path>>(path: P) -> bool {
	fs::metadata(path)
		.map(|metadata| metadata.is_dir())
		.unwrap_or(false)
}

pub fn convert_to_webp<P: AsRef<Path>>(
	image_path: P,
	high_res: bool,
) -> Result<PathBuf, ImageConversionError> {
	let path_reference = image_path.as_ref();
	let image: image::DynamicImage = ImageReader::open(path_reference)?
		.with_guessed_format()?
		.decode()?;
	let image = if high_res {
		image.resize(
			image.width() / 4,
			image.height() / 4,
			image::imageops::FilterType::Nearest,
		)
	} else {
		image.resize(
			image.width() / 8,
			image.height() / 8,
			image::imageops::FilterType::Nearest,
		)
	};

	let encoder: Encoder =
		Encoder::from_image(&image).map_err(|e| ImageConversionError::StrError(e.to_string()))?;
	let encoded_webp: WebPMemory = encoder.encode_simple(false, WEBP_QUALITY)?;

	let parent_directory = get_parent_directory(path_reference)?;
	let filename_original_image = get_file_name(path_reference)?;

	let mut path = parent_directory.to_owned();
	path.push(if high_res {
		PREVIEW_FOLDER_NAME
	} else {
		THUMBNAIL_FOLDER_NAME
	});

	if !directory_exists(&path) {
		fs::create_dir_all(&path)?;
		thread::sleep(Duration::from_millis(500)); // Sleep here a bit so the file watcher can catch up
	}

	path.push(filename_original_image);
	path.set_extension(WEBP_EXTENSION);
	fs::write(&path, &*encoded_webp)?;

	Ok(path)
}

pub fn check_if_thumbnail_exists<P: AsRef<Path>>(
	image_path: P,
) -> Result<bool, ImageConversionError> {
	let path_reference = image_path.as_ref();
	let parent_directory = get_parent_directory(path_reference)?;
	let filename_original_image = get_file_name(path_reference)?;

	let mut path = parent_directory.to_owned();
	path.push(THUMBNAIL_FOLDER_NAME);
	path.push(filename_original_image);
	path.set_extension(WEBP_EXTENSION);
	Ok(path.exists())
}

pub fn check_if_preview_exists<P: AsRef<Path>>(
	image_path: P,
) -> Result<bool, ImageConversionError> {
	let path_reference = image_path.as_ref();
	let parent_directory = get_parent_directory(path_reference)?;
	let filename_original_image = get_file_name(path_reference)?;

	let mut path = parent_directory.to_owned();
	path.push(PREVIEW_FOLDER_NAME);
	path.push(filename_original_image);
	path.set_extension(WEBP_EXTENSION);
	Ok(path.exists())
}

fn get_parent_directory(path_reference: &Path) -> Result<&Path, ImageConversionError> {
	path_reference.parent().ok_or_else(|| {
		ImageConversionError::FailedToGetParentDirectoryError(format!(
			"{:?}",
			path_reference.to_str()
		))
	})
}

fn get_file_name(path_reference: &Path) -> Result<&OsStr, ImageConversionError> {
	path_reference.file_name().ok_or_else(|| {
		ImageConversionError::FailedToGetFileNameError(format!("{:?}", path_reference.to_str()))
	})
}
