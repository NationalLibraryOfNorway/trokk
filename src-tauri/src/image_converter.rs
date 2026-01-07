use byteorder::{BigEndian, LittleEndian, ReadBytesExt, WriteBytesExt};
use exif::{In, Reader, Tag, Value};
use image::ImageReader;
use img_parts::jpeg::Jpeg;
use img_parts::{Bytes, ImageEXIF};
use serde::{Deserialize, Serialize};
use std::ffi::OsStr;
use std::path::{Path, PathBuf};
use std::time::Duration;
#[cfg(target_os = "windows")]
use std::time::SystemTime;
use std::{
	fs,
	io::{BufReader, Cursor, Read, Seek, SeekFrom, Write},
	thread,
};
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

	// Try to read EXIF orientation using exif crate
	let orientation: u16 = match fs::File::open(path_reference) {
		Ok(file) => {
			let mut bufreader = BufReader::new(&file);
			match Reader::new().read_from_container(&mut bufreader) {
				Ok(exif_data) => {
					// Try to get the orientation field
					match exif_data.get_field(Tag::Orientation, In::PRIMARY) {
						Some(field) => match field.value {
							Value::Short(ref v) if !v.is_empty() => v[0],
							_ => 1,
						},
						None => 1,
					}
				}
				Err(_) => 1, // No EXIF data
			}
		}
		Err(_) => 1, // Can't read file, default to normal orientation
	};

	// Apply transformation based on EXIF orientation value
	// See: https://magnushoff.com/articles/jpeg-orientation/
	let transformed = match orientation {
		1 => image,                     // Normal - no transformation needed
		2 => image.fliph(),             // Flipped horizontally
		3 => image.rotate180(),         // Rotated 180°
		4 => image.flipv(),             // Flipped vertically
		5 => image.rotate90().fliph(),  // Rotated 90° CW and flipped horizontally
		6 => image.rotate90(),          // Rotated 90° CW
		7 => image.rotate270().fliph(), // Rotated 90° CCW and flipped horizontally
		8 => image.rotate270(),         // Rotated 90° CCW (270° CW)
		_ => image,                     // Unknown orientation - return as-is
	};

	Ok(transformed)
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

	// Load image and decode with EXIF orientation applied
	let reader = ImageReader::open(path_reference)?.with_guessed_format()?;

	// Decode the image
	let image: image::DynamicImage = reader.decode()?;

	// Apply EXIF orientation if present
	let image = apply_exif_orientation(path_reference, image)?;

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

	// Rotate the original file by updating EXIF orientation (instant)
	rotate_with_exif(path_reference, rotation)?;

	// Rotate WebP files (thumbnail and preview)
	rotate_webp_files(path_reference, rotation)?;

	// Windows Explorer can cache thumbnails and sometimes miss EXIF-only changes.
	// Bumping the file's modification time is a simple way to encourage thumbnail regeneration.
	bump_mtime_for_windows_explorer(path_reference)?;

	Ok(())
}

/// Rotates an image by updating the EXIF Orientation tag
fn rotate_with_exif<P: AsRef<Path>>(
	image_path: P,
	rotation: u16,
) -> Result<(), ImageConversionError> {
	let path_reference = image_path.as_ref();

	// Read current orientation to accumulate rotations
	let current_orientation: u16 = {
		let file = fs::File::open(path_reference).map_err(|e| {
			ImageConversionError::StrError(format!("Failed to read image file: {}", e))
		})?;
		let mut bufreader = BufReader::new(&file);

		match Reader::new().read_from_container(&mut bufreader) {
			Ok(exif_data) => match exif_data.get_field(Tag::Orientation, In::PRIMARY) {
				Some(field) => match field.value {
					Value::Short(ref v) if !v.is_empty() => v[0],
					_ => 1,
				},
				None => 1,
			},
			Err(_) => 1, // No EXIF data, default to normal orientation
		}
	}; // File and buffer are dropped here automatically

	// Map current orientation to degrees
	let current_degrees = match current_orientation {
		1 => 0,
		6 => 90,
		3 => 180,
		8 => 270,
		_ => 0, // Treat unknown orientations as normal
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

	// Detect file type by extension
	let extension = path_reference
		.extension()
		.and_then(OsStr::to_str)
		.map(|s| s.to_lowercase())
		.unwrap_or_default();

	// Handle JPEG and TIFF differently due to different file formats
	match extension.as_str() {
		"jpg" | "jpeg" => {
			// For JPEG, use img-parts to manipulate EXIF segments
			let jpeg_data = fs::read(path_reference).map_err(|e| {
				ImageConversionError::StrError(format!("Failed to read JPEG: {}", e))
			})?;

			let mut jpeg = Jpeg::from_bytes(jpeg_data.into()).map_err(|e| {
				ImageConversionError::StrError(format!("Failed to parse JPEG: {}", e))
			})?;

			// Read existing EXIF to preserve other metadata
			let existing_exif = jpeg.exif().and_then(|exif_bytes| {
				let bytes_vec = exif_bytes.to_vec();
				let mut cursor = Cursor::new(&bytes_vec);
				Reader::new().read_from_container(&mut cursor).ok()
			});

			// Create new EXIF with updated orientation, preserving other fields
			let new_exif_buf = {
				let mut exif_writer = exif::experimental::Writer::new();

				// Copy existing EXIF fields except Orientation
				if let Some(ref exif) = existing_exif {
					for field in exif.fields() {
						if field.tag != Tag::Orientation {
							exif_writer.push_field(field);
						}
					}
				}

				// Add/update the orientation field
				let orientation_field = exif::Field {
					tag: Tag::Orientation,
					ifd_num: In::PRIMARY,
					value: Value::Short(vec![new_orientation]),
				};
				exif_writer.push_field(&orientation_field);

				// Write EXIF data
				let mut buf = Cursor::new(Vec::new());
				exif_writer.write(&mut buf, false).map_err(|e| {
					ImageConversionError::StrError(format!("Failed to write EXIF: {}", e))
				})?;
				buf.into_inner()
			};

			// Set the new EXIF data
			jpeg.set_exif(Some(Bytes::from(new_exif_buf)));

			// Write back to file
			fs::write(path_reference, jpeg.encoder().bytes()).map_err(|e| {
				ImageConversionError::StrError(format!("Failed to write JPEG: {}", e))
			})?;

			Ok(())
		}
		"tif" | "tiff" => {
			// For TIFF files, we update the Orientation tag directly in the IFD
			// without re-encoding the image data to keep it fast
			update_tiff_orientation(path_reference, new_orientation).map_err(|e| {
				ImageConversionError::StrError(format!("Failed to update TIFF orientation: {}", e))
			})?;

			Ok(())
		}
		_ => Err(ImageConversionError::StrError(format!(
			"Unsupported file format for rotation: .{}",
			extension
		))),
	}
}

/// Updates the orientation tag in a TIFF file's IFD without re-encoding the image
fn update_tiff_orientation<P: AsRef<Path>>(path: P, orientation: u16) -> Result<(), String> {
	let path = path.as_ref();

	// Open file for reading and writing
	let mut file = fs::OpenOptions::new()
		.read(true)
		.write(true)
		.open(path)
		.map_err(|e| format!("Failed to open TIFF file: {}", e))?;

	// Read TIFF header to determine endianness
	let mut header = [0u8; 8];
	file.read_exact(&mut header)
		.map_err(|e| format!("Failed to read TIFF header: {}", e))?;

	// Check byte order (II = little-endian, MM = big-endian)
	let is_little_endian = match &header[0..2] {
		b"II" => true,
		b"MM" => false,
		_ => return Err("Invalid TIFF file: unrecognized byte order marker".to_string()),
	};

	// Verify TIFF magic number (42)
	let magic = if is_little_endian {
		u16::from_le_bytes([header[2], header[3]])
	} else {
		u16::from_be_bytes([header[2], header[3]])
	};

	if magic != 42 {
		return Err(format!(
			"Invalid TIFF file: magic number is {} instead of 42",
			magic
		));
	}

	// Read offset to first IFD
	let ifd_offset = if is_little_endian {
		u32::from_le_bytes([header[4], header[5], header[6], header[7]])
	} else {
		u32::from_be_bytes([header[4], header[5], header[6], header[7]])
	};

	// Seek to IFD
	file.seek(SeekFrom::Start(ifd_offset as u64))
		.map_err(|e| format!("Failed to seek to IFD: {}", e))?;

	// Read number of directory entries
	let num_entries = if is_little_endian {
		file.read_u16::<LittleEndian>()
	} else {
		file.read_u16::<BigEndian>()
	}
	.map_err(|e| format!("Failed to read IFD entry count: {}", e))?;

	// TIFF IFD entry is 12 bytes: tag(2) + type(2) + count(4) + value/offset(4)
	const ORIENTATION_TAG: u16 = 274; // 0x0112

	// Search for Orientation tag
	for i in 0..num_entries {
		let entry_offset = ifd_offset as u64 + 2 + (i as u64 * 12);
		file.seek(SeekFrom::Start(entry_offset))
			.map_err(|e| format!("Failed to seek to IFD entry: {}", e))?;

		let tag = if is_little_endian {
			file.read_u16::<LittleEndian>()
		} else {
			file.read_u16::<BigEndian>()
		}
		.map_err(|e| format!("Failed to read tag: {}", e))?;

		if tag == ORIENTATION_TAG {
			// Found the Orientation tag!
			// Skip type(2) and count(4) to get to value
			file.seek(SeekFrom::Current(6))
				.map_err(|e| format!("Failed to seek to orientation value: {}", e))?;

			// Write the new orientation value (it's stored directly in the value field for SHORT type)
			if is_little_endian {
				file.write_u16::<LittleEndian>(orientation)
			} else {
				file.write_u16::<BigEndian>(orientation)
			}
			.map_err(|e| format!("Failed to write orientation value: {}", e))?;

			// Flush to ensure data is written
			file.flush()
				.map_err(|e| format!("Failed to flush file: {}", e))?;

			return Ok(());
		}
	}

	// Orientation tag not found - this is actually okay, some TIFFs don't have it
	// We would need to add a new IFD entry, which is more complex
	Err(
		"Orientation tag not found in TIFF IFD. The file may not have EXIF data. \
		 Adding new IFD entries is not yet supported."
			.to_string(),
	)
}

/// Regenerates WebP thumbnail and preview files from the rotated original
fn rotate_webp_files<P: AsRef<Path>>(
	image_path: P,
	_rotation: u16,
) -> Result<(), ImageConversionError> {
	let path_reference = image_path.as_ref();
	let parent_directory =
		file_utils::get_parent_directory(path_reference).map_err(ImageConversionError::StrError)?;
	let filename_original_image =
		file_utils::get_file_name(path_reference).map_err(ImageConversionError::StrError)?;

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

	// Always regenerate preview synchronously so the UI can reload immediately after rotation.
	// This prevents the detail modal from briefly showing a broken image while the preview
	// is being regenerated.
	if preview_path.exists() {
		let _ = fs::remove_file(&preview_path); // Ignore errors; we'll regenerate it.
	}
	convert_to_webp(path_reference, true)?; // Preview

	Ok(())
}

#[cfg(target_os = "windows")]
fn bump_mtime_for_windows_explorer(path: &Path) -> Result<(), ImageConversionError> {
	// "filetime" is already in Cargo.toml; on Windows this maps to the native SetFileTime.
	let now = filetime::FileTime::from_system_time(SystemTime::now());
	filetime::set_file_mtime(path, now)
		.map_err(|e| ImageConversionError::StrError(format!("Failed to update mtime: {e}")))
}

#[cfg(not(target_os = "windows"))]
fn bump_mtime_for_windows_explorer(_path: &Path) -> Result<(), ImageConversionError> {
	Ok(())
}
