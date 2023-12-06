use thiserror::Error;

#[allow(clippy::enum_variant_names)]
#[derive(Error, Debug)]
pub enum ImageConversionError {
	#[error("Failed to decode image: {0}")]
	ImageError(#[from] image::ImageError),
	#[error("Failed to read image: {0}")]
	IoError(#[from] std::io::Error),
	#[error("Failed to encode WebP: {0}")]
	WebPEncodingError(#[from] WebPEncodingErrorWrapper),
	#[error("Failed to get parent directory: {0}")]
	FailedToGetParentDirectoryError(String),
	#[error("Failed to get file name: {0}")]
	FailedToGetFileNameError(String),
	#[error("{0}")]
	StrError(String),
}

pub struct WebPEncodingErrorWrapper(webp::WebPEncodingError);

impl From<webp::WebPEncodingError> for ImageConversionError {
	fn from(error: webp::WebPEncodingError) -> Self {
		ImageConversionError::WebPEncodingError(WebPEncodingErrorWrapper(error))
	}
}

impl std::fmt::Debug for WebPEncodingErrorWrapper {
	fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
		write!(f, "WebPEncodingErrorWrapper({:?})", self.0)
	}
}

impl std::fmt::Display for WebPEncodingErrorWrapper {
	fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
		write!(f, "{:?}", self.0)
	}
}

impl std::error::Error for WebPEncodingErrorWrapper {}
