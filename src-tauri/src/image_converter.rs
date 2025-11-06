use image::ImageReader;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::time::Duration;
use std::{fs, thread};
use webp::Encoder;

use crate::error::ImageConversionError;
use crate::file_utils;

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

/// Reads EXIF orientation from an image file and applies the transformation to the image
/// This ensures thumbnails and previews match the intended orientation
fn apply_exif_orientation<P: AsRef<Path>>(
	image_path: P,
	image: image::DynamicImage,
) -> Result<image::DynamicImage, ImageConversionError> {
	let path_reference = image_path.as_ref();

	// Try to read EXIF orientation using exiftool
	let orientation_output = std::process::Command::new("exiftool")
		.arg("-n")
		.arg("-Orientation")
		.arg("-s3")
		.arg(path_reference.as_os_str())
		.output();

	// If exiftool fails or orientation is not found, return image as-is
	let orientation: u16 = match orientation_output {
		Ok(output) if output.status.success() => {
			let output_str = String::from_utf8_lossy(&output.stdout);
			output_str.trim().parse().unwrap_or(1)
		}
		_ => return Ok(image), // No orientation or exiftool not available
	};

	// Apply transformation based on EXIF orientation value
	// See: https://magnushoff.com/articles/jpeg-orientation/
	let transformed = match orientation {
		1 => image, // Normal - no transformation needed
		2 => image.fliph(), // Flipped horizontally
		3 => image.rotate180(), // Rotated 180°
		4 => image.flipv(), // Flipped vertically
		5 => image.rotate90().fliph(), // Rotated 90° CW and flipped horizontally
		6 => image.rotate90(), // Rotated 90° CW
		7 => image.rotate270().fliph(), // Rotated 90° CCW and flipped horizontally
		8 => image.rotate270(), // Rotated 90° CCW (270° CW)
		_ => image, // Unknown orientation - return as-is
	};

	Ok(transformed)
}

pub fn convert_directory_to_webp<P: AsRef<Path>>(
	directory_path: P,
) -> Result<ConversionCount, ImageConversionError> {
	let files = file_utils::list_image_files_in_directory(directory_path)?;
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

	// Load image and decode with EXIF orientation applied
	let mut reader = ImageReader::open(path_reference)?;
	reader = reader.with_guessed_format()?;

	// Decode the image
	let mut image: image::DynamicImage = reader.decode()?;

	// Apply EXIF orientation if present
	image = apply_exif_orientation(path_reference, image)?;

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
	let encoded_webp = encoder.encode_simple(false, WEBP_QUALITY)?;

	let parent_directory = file_utils::get_parent_directory(path_reference)
		.map_err(|e| ImageConversionError::StrError(e))?;
	let filename_original_image = file_utils::get_file_name(path_reference)
		.map_err(|e| ImageConversionError::StrError(e))?;

	let mut path = parent_directory.to_owned();
	path.push(if high_res {
		PREVIEW_FOLDER_NAME
	} else {
		THUMBNAIL_FOLDER_NAME
	});

	if !file_utils::directory_exists(&path) {
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
	let parent_directory = file_utils::get_parent_directory(path_reference)
		.map_err(|e| ImageConversionError::StrError(e))?;
	let filename_original_image = file_utils::get_file_name(path_reference)
		.map_err(|e| ImageConversionError::StrError(e))?;

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
	let parent_directory = file_utils::get_parent_directory(path_reference)
		.map_err(|e| ImageConversionError::StrError(e))?;
	let filename_original_image = file_utils::get_file_name(path_reference)
		.map_err(|e| ImageConversionError::StrError(e))?;

	let mut path = parent_directory.to_owned();
	path.push(PREVIEW_FOLDER_NAME);
	path.push(filename_original_image);
	path.set_extension(WEBP_EXTENSION);
	Ok(path.exists())
}

/// Rotates an image by the specified angle (0, 90, 180, 270 degrees)
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

	// Rotate the original file using exiftool (instant)
	rotate_with_exiftool(path_reference, rotation)?;

	// Rotate WebP files (thumbnail and preview)
	rotate_webp_files(path_reference, rotation)?;

	Ok(())
}

/// Rotates an image using exiftool by updating the EXIF Orientation tag
fn rotate_with_exiftool<P: AsRef<Path>>(
	image_path: P,
	rotation: u16,
) -> Result<(), ImageConversionError> {
	let path_reference = image_path.as_ref();

	// Read the current orientation directly (no separate version check)
	let current_output = std::process::Command::new("exiftool")
		.arg("-n")
		.arg("-Orientation")
		.arg("-s3")  // Short output, values only
		.arg(path_reference.as_os_str())
		.output()
		.map_err(|e| ImageConversionError::StrError(format!("Failed to read orientation: {}", e)))?;

	let current_orientation: u16 = if current_output.status.success() {
		let output_str = String::from_utf8_lossy(&current_output.stdout);
		output_str.trim().parse().unwrap_or(1)
	} else {
		1  // Default to normal orientation if not found
	};

	// Map current orientation to degrees
	let current_degrees = match current_orientation {
		1 => 0,
		6 => 90,
		3 => 180,
		8 => 270,
		_ => 0,  // Treat unknown orientations as normal
	};

	// Add the rotation
	let new_degrees = (current_degrees + rotation) % 360;

	// Map back to orientation value
	let new_orientation = match new_degrees {
		0 => 1,
		90 => 6,
		180 => 3,
		270 => 8,
		_ => 1,
	};

	// Only update if orientation changed
	if new_orientation == current_orientation {
		return Ok(());
	}

	// Execute exiftool to set new orientation
	// -n flag uses numeric values
	// -overwrite_original avoids creating backup files
	// -Orientation# sets the orientation value
	let output = std::process::Command::new("exiftool")
		.arg("-n")
		.arg("-overwrite_original")
		.arg(format!("-Orientation#={}", new_orientation))
		.arg(path_reference.as_os_str())
		.output()
		.map_err(|e| ImageConversionError::StrError(format!("Failed to execute exiftool: {}", e)))?;

	if !output.status.success() {
		let stderr = String::from_utf8_lossy(&output.stderr);
		return Err(ImageConversionError::StrError(format!(
			"exiftool failed: {}",
			stderr
		)));
	}
	Ok(())
}

/// Regenerates WebP thumbnail and preview files from the rotated original
fn rotate_webp_files<P: AsRef<Path>>(
	image_path: P,
	_rotation: u16,
) -> Result<(), ImageConversionError> {
	let path_reference = image_path.as_ref();
	let parent_directory = file_utils::get_parent_directory(path_reference)
		.map_err(|e| ImageConversionError::StrError(e))?;
	let filename_original_image = file_utils::get_file_name(path_reference)
		.map_err(|e| ImageConversionError::StrError(e))?;

	// Build paths
	let mut thumbnail_path = parent_directory.to_owned();
	thumbnail_path.push(THUMBNAIL_FOLDER_NAME);
	thumbnail_path.push(filename_original_image);
	thumbnail_path.set_extension(WEBP_EXTENSION);

	let mut preview_path = parent_directory.to_owned();
	preview_path.push(PREVIEW_FOLDER_NAME);
	preview_path.push(filename_original_image);
	preview_path.set_extension(WEBP_EXTENSION);

	// Always regenerate thumbnail (needed for grid view)
	convert_to_webp(path_reference, false)?; // Thumbnail

	// If preview exists, user is viewing in detail view - regenerate it too
	// If it doesn't exist, skip for performance (will be generated on-demand later)
	if preview_path.exists() {
		fs::remove_file(&preview_path)?;
		convert_to_webp(path_reference, true)?; // Preview
	}


	Ok(())
}



