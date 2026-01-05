use byteorder::{BigEndian, LittleEndian, ReadBytesExt, WriteBytesExt};
use exif::{In, Reader, Tag, Value};
use img_parts::jpeg::Jpeg;
use img_parts::{Bytes, ImageEXIF};
use serde::{Deserialize, Serialize};
use std::ffi::OsStr;
use std::path::{Path, PathBuf};
use std::{
	fs,
	io::{BufReader, Cursor, Read, Seek, SeekFrom, Write},
};

use crate::error::ImageConversionError;
use crate::file_utils;

// New backend
use fs2::FileExt;
use libvips::{ops, VipsApp, VipsImage};
use once_cell::sync::OnceCell;
use std::fs::OpenOptions;

const THUMBNAIL_FOLDER_NAME: &str = ".thumbnails";
const PREVIEW_FOLDER_NAME: &str = ".previews";
const WEBP_EXTENSION: &str = "webp";

// Keep roughly the same sizing behavior as before.
// NOTE: libvips prefers target dimensions rather than "divide by N".
// We'll compute target dims from metadata.
const THUMB_DIVISOR: i32 = 8;
const PREVIEW_DIVISOR: i32 = 4;

// Keep a single VipsApp alive for the entire process.
// IMPORTANT: Dropping VipsApp calls vips_shutdown(), which is not safe to do repeatedly
// during the lifetime of a process that continues to use libvips (eg. unit tests).
static VIPS_APP: OnceCell<VipsApp> = OnceCell::new();

fn ensure_vips() -> Result<(), ImageConversionError> {
	VIPS_APP
		.get_or_try_init(|| {
			VipsApp::new("trokk", false).map_err(|e| {
				ImageConversionError::StrError(format!("Failed to init libvips: {e}"))
			})
		})
		.map(|_| ())
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all(serialize = "camelCase"))]
pub struct ConversionCount {
	pub(crate) converted: u32,
	pub(crate) already_converted: u32,
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

fn output_paths_for<P: AsRef<Path>>(
	image_path: P,
	high_res: bool,
) -> Result<PathBuf, ImageConversionError> {
	let path_reference = image_path.as_ref();
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
	path.push(filename_original_image);
	path.set_extension(WEBP_EXTENSION);
	Ok(path)
}

/// Create or open a lock file next to the output to prevent concurrent writers.
fn lock_for_output(output_path: &Path) -> Result<std::fs::File, ImageConversionError> {
	// Ensure the output directory exists before creating a lock file within it.
	if let Some(parent) = output_path.parent() {
		fs::create_dir_all(parent)?;
	}

	let mut lock_path = output_path.to_path_buf();
	lock_path.set_extension(format!("{}{}", WEBP_EXTENSION, ".lock"));
	let file = OpenOptions::new()
		.create(true)
		.read(true)
		.write(true)
		.open(&lock_path)
		.map_err(|e| ImageConversionError::StrError(format!("Failed to open lock file: {e}")))?;
	file.lock_exclusive()
		.map_err(|e| ImageConversionError::StrError(format!("Failed to acquire lock: {e}")))?;
	Ok(file)
}

fn write_atomic(output_path: &Path, bytes: &[u8]) -> Result<(), ImageConversionError> {
	let mut tmp_path = output_path.to_path_buf();
	// e.g. foo.webp.tmp
	tmp_path.set_extension(format!("{}{}", WEBP_EXTENSION, ".tmp"));

	if let Some(parent) = output_path.parent() {
		fs::create_dir_all(parent)?;
	}

	fs::write(&tmp_path, bytes)?;
	// atomic replace on same filesystem
	fs::rename(&tmp_path, output_path)?;
	Ok(())
}

pub fn check_if_thumbnail_exists<P: AsRef<Path>>(
	image_path: P,
) -> Result<bool, ImageConversionError> {
	let out = output_paths_for(image_path, false)?;
	Ok(out.exists())
}

pub fn check_if_preview_exists<P: AsRef<Path>>(
	image_path: P,
) -> Result<bool, ImageConversionError> {
	let out = output_paths_for(image_path, true)?;
	Ok(out.exists())
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

	ensure_vips()?;

	let output_path = output_paths_for(path_reference, high_res)?;
	let _lock_guard = lock_for_output(&output_path)?;

	if output_path.exists() {
		return Ok(output_path);
	}

	let divisor = if high_res { PREVIEW_DIVISOR } else { THUMB_DIVISOR };
	let src = path_reference
		.to_str()
		.ok_or_else(|| ImageConversionError::StrError("Invalid UTF-8 path".to_string()))?;

	// Read header/dimensions via libvips.
	let img = VipsImage::new_from_file(src)
		.map_err(|e| ImageConversionError::StrError(format!("Failed to open image: {e}")))?;
	let w = img.get_width();
	let h = img.get_height();
	if w <= 0 || h <= 0 {
		return Err(ImageConversionError::StrError("Image has invalid dimensions".to_string()));
	}

	let target_w = std::cmp::max(1, w / divisor);
	let _target_h = std::cmp::max(1, h / divisor);

	let resized = ops::thumbnail(src, target_w)
		.and_then(|img| ops::autorot(&img))
		.map_err(|e| {
			let vips_details = VIPS_APP
				.get()
				.and_then(|app| app.error_buffer().ok())
				.unwrap_or("");
			if let Some(app) = VIPS_APP.get() {
				app.error_clear();
			}
			ImageConversionError::StrError(format!(
				"Failed to create thumbnail: {e}{}{}",
				if vips_details.is_empty() { "" } else { "\nlibvips: " },
				vips_details
			))
		})?;

	// Encode to webp. (The libvips crate exposes image_write_to_buffer without extra args;
	// it uses libvips defaults for that suffix.)
	// TODO: If you want exact quality/strip control, we can wire `webpsave_buffer_with_opts`.
	let webp_bytes = resized
		.image_write_to_buffer(".webp")
		.map_err(|e| ImageConversionError::StrError(format!("Failed to encode webp: {e}")))?;

	write_atomic(&output_path, &webp_bytes)?;
	Ok(output_path)
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
	if rotation == 0 {
		return Ok(());
	}

	// Rotate the original file by updating EXIF orientation (instant)
	rotate_with_exif(path_reference, rotation)?;

	// Regenerate both cached webps synchronously to keep UI consistent.
	// The async background refresh caused thumbnail/preview desync.
	let thumb_out = output_paths_for(path_reference, false)?;
	let prev_out = output_paths_for(path_reference, true)?;
	let _thumb_lock = lock_for_output(&thumb_out)?;
	let _prev_lock = lock_for_output(&prev_out)?;

	if thumb_out.exists() {
		let _ = fs::remove_file(&thumb_out);
	}
	if prev_out.exists() {
		let _ = fs::remove_file(&prev_out);
	}

	// Recreate (these are now fast with libvips)
	let _ = convert_to_webp(path_reference, false)?;
	let _ = convert_to_webp(path_reference, true)?;

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

