use image::ImageReader;
use image::metadata::Orientation;
use little_exif::exif_tag::ExifTag;
use little_exif::metadata::Metadata;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::Duration;
use std::{fs, thread};
use webp::Encoder;

use crate::error::ImageConversionError;
use crate::file_utils;
use once_cell::sync::Lazy;

const THUMBNAIL_FOLDER_NAME: &str = ".thumbnails";
const PREVIEW_FOLDER_NAME: &str = ".previews";
const WEBP_EXTENSION: &str = "webp";
const WEBP_QUALITY: f32 = 25.0;
const DEFAULT_THUMBNAIL_FRACTION: u32 = 8;
const DEFAULT_PREVIEW_FRACTION: u32 = 4;
const MIN_SIZE_FRACTION: u32 = 1;
const MAX_SIZE_FRACTION: u32 = 16;

#[derive(Debug, Clone, Copy)]
struct ImageSizeFractions {
	thumbnail_fraction: u32,
	preview_fraction: u32,
}

static IMAGE_SIZE_FRACTIONS: Lazy<Mutex<ImageSizeFractions>> = Lazy::new(|| {
	Mutex::new(ImageSizeFractions {
		thumbnail_fraction: DEFAULT_THUMBNAIL_FRACTION,
		preview_fraction: DEFAULT_PREVIEW_FRACTION,
	})
});

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversionCount {
	pub(crate) converted: u32,
	pub(crate) already_converted: u32,
}

pub fn set_image_size_fractions(
	thumbnail_fraction: u32,
	preview_fraction: u32,
) -> Result<(), String> {
	let valid_range = MIN_SIZE_FRACTION..=MAX_SIZE_FRACTION;
	if !valid_range.contains(&thumbnail_fraction) || !valid_range.contains(&preview_fraction) {
		return Err(format!(
			"Invalid thumbnail or preview fraction. Both must be between {} and {}.",
			MIN_SIZE_FRACTION, MAX_SIZE_FRACTION
		));
	}

	let mut fractions = IMAGE_SIZE_FRACTIONS.lock().map_err(|e| e.to_string())?;
	fractions.thumbnail_fraction = thumbnail_fraction;
	fractions.preview_fraction = preview_fraction;
	Ok(())
}

fn get_fraction(high_res: bool) -> u32 {
	let fractions = IMAGE_SIZE_FRACTIONS
		.lock()
		.map(|f| *f)
		.unwrap_or(ImageSizeFractions {
			thumbnail_fraction: DEFAULT_THUMBNAIL_FRACTION,
			preview_fraction: DEFAULT_PREVIEW_FRACTION,
		});
	if high_res {
		fractions.preview_fraction
	} else {
		fractions.thumbnail_fraction
	}
}

pub fn convert_directory_to_webp<P: AsRef<Path>>(
	directory_path: P,
) -> Result<ConversionCount, ImageConversionError> {
	let files = file_utils::list_image_files(directory_path, false)?;
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

	// Load image
	let reader = ImageReader::open(path_reference)?.with_guessed_format()?;
	let mut image: image::DynamicImage = reader.decode()?;

	// Apply EXIF Orientation (if missing/invalid, do nothing)
	let orientation = Metadata::new_from_path(path_reference)
		.ok()
		.and_then(|m| {
			m.get_tag(&ExifTag::Orientation(vec![]))
				.next()
				.and_then(|t| match t {
					ExifTag::Orientation(v) => v.first().copied(),
					_ => None,
				})
		})
		.unwrap_or(1);

	let orientation =
		Orientation::from_exif(orientation as u8).unwrap_or(Orientation::NoTransforms);

	image = match orientation {
		Orientation::NoTransforms => image,
		Orientation::Rotate90 => image.rotate90(),
		Orientation::Rotate180 => image.rotate180(),
		Orientation::Rotate270 => image.rotate270(),
		_ => image,
	};
	let fraction = get_fraction(high_res);
	let resized_width = (image.width() / fraction).max(1);
	let resized_height = (image.height() / fraction).max(1);
	let image = image.resize(
		resized_width,
		resized_height,
		image::imageops::FilterType::Nearest,
	);

	let encoder: Encoder =
		Encoder::from_image(&image).map_err(|e| ImageConversionError::StrError(e.to_string()))?;
	let encoded_webp = encoder.encode_simple(false, WEBP_QUALITY)?;

	let parent_directory =
		file_utils::get_parent_directory(path_reference).map_err(ImageConversionError::StrError)?;
	let filename_original_image =
		file_utils::get_file_name(path_reference).map_err(ImageConversionError::StrError)?;

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
	let parent_directory =
		file_utils::get_parent_directory(path_reference).map_err(ImageConversionError::StrError)?;
	let filename_original_image =
		file_utils::get_file_name(path_reference).map_err(ImageConversionError::StrError)?;

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
	let parent_directory =
		file_utils::get_parent_directory(path_reference).map_err(ImageConversionError::StrError)?;
	let filename_original_image =
		file_utils::get_file_name(path_reference).map_err(ImageConversionError::StrError)?;

	let mut path = parent_directory.to_owned();
	path.push(PREVIEW_FOLDER_NAME);
	path.push(filename_original_image);
	path.set_extension(WEBP_EXTENSION);
	Ok(path.exists())
}

/// Rotates an image in clockwise or counterclockwise direction
/// Used from frontend to rotate and generate new WebP previews/thumbnails
pub fn rotate_image<P: AsRef<Path>>(
	image_path: P,
	direction: &str,
) -> Result<(), ImageConversionError> {
	let path_reference = image_path.as_ref();

	rotate_image_by_exif(path_reference, direction)?;
	rerender_webp_files(path_reference)?;

	Ok(())
}

fn rotate_image_by_exif(
	path_reference: &Path,
	direction: &str,
) -> Result<(), ImageConversionError> {
	let mut metadata = Metadata::new_from_path(path_reference).map_err(|e| {
		ImageConversionError::StrError(format!(
			"Failed to read EXIF metadata from {}: {}",
			path_reference.display(),
			e
		))
	})?;

	let current_orientation_u16 = match metadata.get_tag(&ExifTag::Orientation(vec![])).next() {
		Some(ExifTag::Orientation(v)) => v.first().copied().unwrap_or(1),
		_ => 1,
	};

	let current_orientation =
		Orientation::from_exif(current_orientation_u16 as u8).unwrap_or(Orientation::NoTransforms);

	let new_orientation = match direction.to_lowercase().as_str() {
		"clockwise" => rotate_clockwise(current_orientation),
		"counterclockwise" => rotate_counter_clockwise(current_orientation),
		_ => {
			return Err(ImageConversionError::StrError(format!(
				"Invalid direction '{}'. Use 'clockwise' or 'counterclockwise'",
				direction
			)));
		}
	};

	let new_orientation_u16 = new_orientation.to_exif() as u16;
	metadata.set_tag(ExifTag::Orientation(vec![new_orientation_u16]));

	// Write back to file
	metadata.write_to_file(path_reference).map_err(|e| {
		ImageConversionError::StrError(format!(
			"Error writing EXIF metadata to {}: {}",
			path_reference.display(),
			e
		))
	})?;
	Ok(())
}

fn rotate_clockwise(current: Orientation) -> Orientation {
	match current {
		Orientation::NoTransforms => Orientation::Rotate90,
		Orientation::Rotate90 => Orientation::Rotate180,
		Orientation::Rotate180 => Orientation::Rotate270,
		_ => Orientation::NoTransforms,
	}
}

fn rotate_counter_clockwise(current: Orientation) -> Orientation {
	match current {
		Orientation::NoTransforms => Orientation::Rotate270,
		Orientation::Rotate270 => Orientation::Rotate180,
		Orientation::Rotate180 => Orientation::Rotate90,
		_ => Orientation::NoTransforms,
	}
}

/// Regenerates WebP thumbnail and preview files from the rotated original
fn rerender_webp_files<P: AsRef<Path>>(image_path: P) -> Result<(), ImageConversionError> {
	let path_reference = image_path.as_ref();

	let parent_directory = file_utils::get_parent_directory(image_path.as_ref())
		.map_err(ImageConversionError::StrError)?;

	let filename_original_image =
		file_utils::get_file_name(path_reference).map_err(ImageConversionError::StrError)?;

	let mut preview_path = parent_directory.to_owned();

	preview_path.push(PREVIEW_FOLDER_NAME);
	preview_path.push(filename_original_image);
	preview_path.set_extension(WEBP_EXTENSION);

	// Always regenerate thumbnail (needed for grid view)
	convert_to_webp(image_path.as_ref(), false)?; // Thumbnail

	if preview_path.exists() {
		let _ = fs::remove_file(&preview_path); // Ignore errors; we'll regenerate it.
	}
	convert_to_webp(path_reference, true)?; // Preview
	Ok(())
}
