use std::path::PathBuf;

use aws_sdk_s3::config::{Credentials, Region};
use aws_sdk_s3::operation::put_object::PutObjectOutput;
use aws_sdk_s3::primitives::ByteStream;
use aws_sdk_s3::Client;
use tauri::{Emitter, Window};
use tokio::sync::OnceCell;

use crate::file_utils::get_file_paths_in_directory;
use crate::get_secret_variables;
use crate::model::{SecretVariables, TransferProgress};

pub(crate) async fn upload_directory(
	directory_path: &str,
	object_id: &str,
	material_type: &str,
	app_window: Window,
) -> Result<(), String> {
	let secret_variables = get_secret_variables()
		.await
		.map_err(|e| format!("Failed to get secret variables: {}", e))?;

	let client = get_client(secret_variables)
		.await
		.map_err(|e| format!("Failed to get S3 client: {}", e))?;

	let file_paths = get_file_paths_in_directory(directory_path)?;
	for (index, file_path) in file_paths.iter().enumerate() {
		put_object(
			client,
			secret_variables,
			file_path,
			object_id,
			index,
			material_type,
		)
		.await?;

		app_window
			.emit(
				"transfer_progress",
				TransferProgress {
					directory: directory_path.to_string(),
					page_nr: (index + 1),
					total_pages: file_paths.len(),
				},
			)
			.map_err(|e| e.to_string())?;
	}
	Ok(())
}

async fn put_object(
	client: &Client,
	secret_variables: &SecretVariables,
	path: &PathBuf,
	object_id: &str,
	page_nr: usize,
	material_type: &str,
) -> Result<PutObjectOutput, String> {
	let body = ByteStream::read_from()
		.path(path)
		.build()
		.await
		.map_err(|e| format!("Failed to read file: {}", e))?;

	let result = client
		.put_object()
		.bucket(&secret_variables.s3_bucket_name)
		.key(format!(
			"{}/{}/{}_{:0>5}.{}", // The "{:0>5}" is used to pad the page number with zeros.
			material_type,
			object_id,
			object_id,
			page_nr,
			path.extension().unwrap().to_str().unwrap()
		))
		.body(body)
		.send()
		.await
		.inspect_err(|e| {
			println!("Error: {:?}", e);
		})
		.map_err(|e| format!("Failed to upload directory: {:?}", e))?;

	Ok(result)
}

// Use Tokio's OnceCell to create the S3 client only once
static S3_CLIENT_CELL: OnceCell<Client> = OnceCell::const_new();

async fn get_client(secret_variables: &SecretVariables) -> Result<&'static Client, String> {
	// Create the S3 client only once, the cell functions as a cache
	S3_CLIENT_CELL
		.get_or_try_init(|| async { create_client(secret_variables).await })
		.await
		.map_err(|e| e.to_string())
}

async fn create_client(secret_variables: &SecretVariables) -> Result<Client, String> {
	let credentials = Credentials::from_keys(
		&secret_variables.s3_access_key_id,
		&secret_variables.s3_secret_access_key,
		None,
	);

	let config = aws_sdk_s3::Config::builder()
		.credentials_provider(credentials)
		.region(Region::new(secret_variables.s3_region.clone()))
		.endpoint_url(&secret_variables.s3_url)
		.disable_s3_express_session_auth(true)
		.disable_multi_region_access_points(true)
		.force_path_style(true)
		.build();

	Ok(Client::from_conf(config))
}
