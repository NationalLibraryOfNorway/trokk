use image::ImageError;
use image::error::{DecodingError, ImageFormatHint};

use crate::error::{ImageConversionError, WebPEncodingErrorWrapper};

#[test]
fn test_image_conversion_error_image_error_should_display_correct_error_message() {
	let image_error =
		ImageError::Decoding(DecodingError::new(ImageFormatHint::Unknown, "ImageEnd"));
	let actual_error_message = ImageConversionError::ImageError(image_error).to_string();
	let expected_error_message =
		"Failed to decode image: Format error decoding `Unknown`: ImageEnd";
	assert_eq!(actual_error_message, expected_error_message);
}

#[test]
fn test_image_conversion_error_io_error_should_display_correct_error_message() {
	let io_error = std::io::Error::new(std::io::ErrorKind::NotFound, "File not found");
	let actual_error_message = ImageConversionError::IoError(io_error).to_string();
	let expected_error_message = "Failed to read image: File not found";
	assert_eq!(actual_error_message, expected_error_message);
}

#[test]
fn test_image_conversion_error_webp_encoding_error_should_display_correct_error_message() {
	let webp_encoding_error = webp::WebPEncodingError::VP8_ENC_OK;
	let actual_error_message =
		ImageConversionError::WebPEncodingError(WebPEncodingErrorWrapper(webp_encoding_error))
			.to_string();
	let expected_error_message = "Failed to encode WebP: VP8_ENC_OK";
	assert_eq!(actual_error_message, expected_error_message);
}

#[test]
fn test_image_conversion_error_str_error_should_display_correct_error_message() {
	let actual_error_message = ImageConversionError::StrError("Some error".to_string()).to_string();
	let expected_error_message = "Some error";
	assert_eq!(actual_error_message, expected_error_message);
}
