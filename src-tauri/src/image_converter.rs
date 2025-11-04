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

	//Skip conversion if path contains .thumbnails or .previews
	if path_reference
		.components()
		.any(|c| c.as_os_str() == PREVIEW_FOLDER_NAME || c.as_os_str() == THUMBNAIL_FOLDER_NAME)
	{
		return Ok(path_reference.to_path_buf());
	}

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

/// Rotates an image by the specified angle (0, 90, 180, 270 degrees)
/// and regenerates its thumbnails and previews
pub fn rotate_image<P: AsRef<Path>>(
	image_path: P,
	rotation: u16,
) -> Result<(), ImageConversionError> {
	let path_reference = image_path.as_ref();

	// Validate rotation angle
	if rotation != 0 && rotation != 90 && rotation != 180 && rotation != 270 {
		return Err(ImageConversionError::StrError(format!(
			"Invalid rotation angle: {}. Must be 0, 90, 180, or 270",
			rotation
		)));
	}

	// Skip if no rotation needed
	if rotation == 0 {
		return Ok(());
	}

	// Load the original image
	let mut image: image::DynamicImage = ImageReader::open(path_reference)?
		.with_guessed_format()?
		.decode()?;

	// Apply rotation
	image = match rotation {
		90 => image.rotate90(),
		180 => image.rotate180(),
		270 => image.rotate270(),
		_ => image, // Should never happen due to validation above
	};

	// Save the rotated image back to the original file
	image.save(path_reference)?;

	// Ensure file is flushed to disk
	thread::sleep(Duration::from_millis(50));

	// Delete old thumbnails and previews so they get regenerated
	delete_thumbnail_and_preview(path_reference)?;

	// Wait a bit to ensure deletion is complete
	thread::sleep(Duration::from_millis(50));

	// Regenerate thumbnails and previews with the rotated image
	convert_to_webp(path_reference, false)?; // thumbnail
	convert_to_webp(path_reference, true)?; // preview

	// Final sync to ensure all writes are complete
	thread::sleep(Duration::from_millis(100));

	Ok(())
}

fn delete_thumbnail_and_preview<P: AsRef<Path>>(image_path: P) -> Result<(), ImageConversionError> {
	let path_reference = image_path.as_ref();
	let parent_directory = get_parent_directory(path_reference)?;
	let filename_original_image = get_file_name(path_reference)?;

	// Delete thumbnail
	let mut thumbnail_path = parent_directory.to_owned();
	thumbnail_path.push(THUMBNAIL_FOLDER_NAME);
	thumbnail_path.push(filename_original_image);
	thumbnail_path.set_extension(WEBP_EXTENSION);
	if thumbnail_path.exists() {
		fs::remove_file(&thumbnail_path)?;
	}

	// Delete preview
	let mut preview_path = parent_directory.to_owned();
	preview_path.push(PREVIEW_FOLDER_NAME);
	preview_path.push(filename_original_image);
	preview_path.set_extension(WEBP_EXTENSION);
	if preview_path.exists() {
		fs::remove_file(&preview_path)?;
	}

	Ok(())
}
