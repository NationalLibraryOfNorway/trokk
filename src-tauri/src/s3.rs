#[cfg(not(feature = "debug-mock"))]
use crate::file_utils::get_file_paths_in_directory;
#[cfg(not(feature = "debug-mock"))]
use crate::get_secret_variables;
#[cfg(not(feature = "debug-mock"))]
use crate::model::{SecretVariables, TransferProgress};
#[cfg(not(feature = "debug-mock"))]
use aws_sdk_s3::config::{Credentials, Region};
#[cfg(not(feature = "debug-mock"))]
use aws_sdk_s3::primitives::ByteStream;
#[cfg(not(feature = "debug-mock"))]
use aws_sdk_s3::Client;
#[cfg(not(feature = "debug-mock"))]
use std::path::PathBuf;
#[cfg(not(feature = "debug-mock"))]
use tauri::{Emitter, Window};
#[cfg(not(feature = "debug-mock"))]
use tokio::sync::OnceCell;
#[cfg(not(feature = "debug-mock"))]
use tokio::{fs::File, io::{AsyncReadExt, BufReader}};
#[cfg(not(feature = "debug-mock"))]
use aws_sdk_s3::types::{CompletedMultipartUpload, CompletedPart};
#[cfg(not(feature = "debug-mock"))]
use std::path::Path;
#[cfg(not(feature = "debug-mock"))]
use crate::HashMap;
const MULTIPART_PART_SIZE: usize = 16 * 1024 * 1024; // 16 MiB (server limit)

#[cfg(not(feature = "debug-mock"))]
pub(crate) async fn upload_directory(
	directory_path: &str,
	object_id: &str,
	material_type: &str,
	app_window: Window,
) -> Result<usize, String> {
	let secret_variables = get_secret_variables()
		.await
		.map_err(|e| format!("Failed to get secret variables: {e}"))?;

	let client = get_client(secret_variables)
		.await
		.map_err(|e| format!("Failed to get S3 client: {e}"))?;

	let file_paths = get_file_paths_in_directory(directory_path)?;
	for (index, file_path) in file_paths.iter().enumerate() {
		let page_nr = index + 1;
		put_object(
			client,
			secret_variables,
			file_path,
			object_id,
			page_nr,
			material_type,
		)
		.await?;

		app_window
			.emit(
				"transfer_progress",
				TransferProgress {
					directory: directory_path.to_string(),
					page_nr,
					total_pages: file_paths.len(),
				},
			)
			.map_err(|e| e.to_string())?;
	}
	Ok(file_paths.len())
}

#[cfg(not(feature = "debug-mock"))]
pub(crate) async fn upload_batch_to_s3(
	batch_map: HashMap<String, Vec<String>>,
	material_type: &str,
	app_window: Window,
) -> Result<usize, String> {
	let secret_variables = get_secret_variables()
		.await
		.map_err(|e| format!("Failed to get secret variables: {e}"))?;
	let client = get_client(&secret_variables.clone())
		.await
		.map_err(|e| format!("Failed to get S3 client: {e}"))?;

	let mut uploaded_count = 0;
	let total_files: usize = batch_map.values().map(|v| v.len()).sum();

	for (batch_id, batch) in batch_map.iter() {
		for (file_index, file_path_str) in batch.iter().enumerate() {
			let page_nr = file_index + 1;
			let file_path = PathBuf::from(file_path_str);
			put_object(
				client,
				secret_variables,
				&file_path,
				batch_id,
				page_nr,
				material_type,
			)
			.await?;
			uploaded_count += 1;

			let directory = Path::new(file_path_str)
				.parent()
				.map(|p| p.to_string_lossy().to_string())
				.unwrap_or_default();

			app_window
				.emit(
					"transfer_progress",
					TransferProgress {
						directory,
						page_nr: uploaded_count,
						total_pages: total_files,
					},
				)
				.map_err(|e| e.to_string())?;
		}
	}
	Ok(total_files)
}

#[cfg(not(feature = "debug-mock"))]
async fn put_object(
	client: &Client,
	secret_variables: &SecretVariables,
	path: &PathBuf,
	object_id: &str,
	page_nr: usize,
	material_type: &str,
) -> Result<(), String> {

    let key = format!(
        "{}/{}/{}_{:0>5}.{}", // The "{:0>5}" is used to pad the page number with zeros.
        material_type,
        object_id,
        object_id,
        page_nr,
        path.extension().unwrap().to_str().unwrap()
    );

    let meta = tokio::fs::metadata(path)
        .await
        .map_err(|e| format!("stat failed for {}: {e}", path.display()))?;
    let file_size = meta.len() as usize;

    if file_size <= MULTIPART_PART_SIZE {
        // Small file, upload in a single PUT request
        let body = ByteStream::read_from()
            .path(path)
            .build()
            .await
            .map_err(|e| format!("Failed to read file: {e}"))?;

        client
            .put_object()
            .bucket(&secret_variables.s3_bucket_name)
            .key(&key)
            .content_length(file_size as i64)
            .body(body)
            .send()
            .await
            .inspect_err(|e| eprintln!("Error: {e:?}"))
            .map_err(|e| format!("Failed to upload directory: {e:?}"))?;

        Ok(())

    } else {
        // Large file, use multipart upload
        let init = client
            .create_multipart_upload()
            .bucket(&secret_variables.s3_bucket_name)
            .key(&key)
            .send()
            .await
            .map_err(|e| format!("init multipart failed: {e:?}"))?;
        let upload_id = init.upload_id().ok_or("missing upload_id")?.to_string();
        let file = File::open(path)
            .await
            .map_err(|e| format!("open failed for {}: {e}", path.display()))?;
        let mut reader = BufReader::new(file);
        let mut buf = vec![0u8; MULTIPART_PART_SIZE];
        let mut part_number: i32 = 1;
        let mut completed: Vec<CompletedPart> = Vec::new();
        loop {
            // Fill up to MULTIPART_PART_SIZE
            let mut filled = 0usize;
            while filled < MULTIPART_PART_SIZE {
                let n = reader
                    .read(&mut buf[filled..])
                    .await
                    .map_err(|e| format!("read failed: {e}"))?;
                if n == 0 { break; }
                filled += n;
            }
            if filled == 0 { break; }

            // Build a ByteStream for this part (exactly the bytes we read)
            let part_stream = ByteStream::from(buf[..filled].to_vec());

            // Upload part
            let bucket = secret_variables.s3_bucket_name.clone();
            let resp = client
                .upload_part()
                .bucket(&secret_variables.s3_bucket_name)
                .key(&key)
                .upload_id(&upload_id)
                .part_number(part_number)
                .body(part_stream)
                .send()
                .await
                .map_err(|e| {
                    // Try to abort on failure to avoid leaked multiparts
                    let _task = tokio::spawn({
                        let client = client.clone();
                        let bucket = bucket;
                        let key = key.to_owned();
                        let upload_id = upload_id.clone();
                        async move {
                            let _ = client
                                .abort_multipart_upload()
                                .bucket(bucket)
                                .key(key)
                                .upload_id(upload_id)
                                .send()
                                .await;
                        }
                    });
                    format!("upload_part #{part_number} failed: {e:?}")
                })?;

            completed.push(
                CompletedPart::builder()
                    .part_number(part_number)
                    .e_tag(resp.e_tag().unwrap_or_default())
                    .build()
            );
            part_number += 1;
        }

        client
            .complete_multipart_upload()
            .bucket(&secret_variables.s3_bucket_name)
            .key(key)
            .upload_id(upload_id)
            .multipart_upload(
                CompletedMultipartUpload::builder()
                    .set_parts(Some(completed))
                    .build()
            )
            .send()
            .await
            .map_err(|e| format!("complete multipart failed: {e:?}"))?;

        Ok(())
    }
}

// Use Tokio's OnceCell to create the S3 client only once
#[cfg(not(feature = "debug-mock"))]
static S3_CLIENT_CELL: OnceCell<Client> = OnceCell::const_new();

#[cfg(not(feature = "debug-mock"))]
async fn get_client(secret_variables: &SecretVariables) -> Result<&'static Client, String> {
	// Create the S3 client only once, the cell functions as a cache
	S3_CLIENT_CELL
		.get_or_try_init(|| async { create_client(secret_variables).await })
		.await
		.map_err(|e| e.to_string())
}

#[cfg(not(feature = "debug-mock"))]
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
