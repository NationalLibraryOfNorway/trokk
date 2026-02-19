#[cfg(not(feature = "debug-mock"))]
use crate::auth::get_access_token_for_papi_with_secrets;
#[cfg(not(feature = "debug-mock"))]
use crate::auth::parse_papi_token_response;
#[cfg(not(feature = "debug-mock"))]
use crate::model::SecretVariables;

#[cfg(not(feature = "debug-mock"))]
fn create_secret_variables(oidc_tekst_base_url: String) -> SecretVariables {
	SecretVariables {
		papi_path: "http://localhost".to_string(),
		oidc_base_url: "http://localhost".to_string(),
		oidc_client_id: "client-id".to_string(),
		oidc_client_secret: "client-secret".to_string(),
		oidc_tekst_base_url,
		oidc_tekst_client_id: "tekst-client-id".to_string(),
		oidc_tekst_client_secret: "tekst-client-secret".to_string(),
		s3_access_key_id: "s3-key".to_string(),
		s3_secret_access_key: "s3-secret".to_string(),
		s3_url: "http://localhost".to_string(),
		s3_bucket_name: "bucket".to_string(),
		s3_region: "eu-north-1".to_string(),
		startup_version_message: None,
		startup_version_status: None,
		current_version: None,
		latest_version: None,
		auto_login_allowed: true,
	}
}

#[cfg(not(feature = "debug-mock"))]
#[test]
fn test_get_access_token_for_papi_with_secrets_fails_on_invalid_url() {
	let secrets = create_secret_variables("://invalid-url".to_string());
	let err = tokio::runtime::Builder::new_current_thread()
		.enable_all()
		.build()
		.unwrap()
		.block_on(async { get_access_token_for_papi_with_secrets(&secrets).await })
		.err()
		.expect("Expected token fetch to fail");

	assert!(err.contains("Kunne ikke hente autentiseringstoken"));
}

#[cfg(not(feature = "debug-mock"))]
#[test]
fn test_parse_papi_token_response_fails_on_invalid_json() {
	let err = parse_papi_token_response("{ not-json }")
		.err()
		.expect("Expected token parse to fail");

	assert!(err.contains("Kunne ikke tolke token-respons"));
}
