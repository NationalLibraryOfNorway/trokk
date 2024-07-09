use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AuthenticationResponse {
	pub(crate) token_response: TokenResponse,
	pub(crate) expire_info: ExpireInfo,
	pub(crate) user_info: UserInfo,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub(crate) struct TokenResponse {
	#[serde(rename(serialize = "accessToken", deserialize = "access_token"))]
	pub(crate) access_token: String,
	#[serde(rename(serialize = "expiresIn", deserialize = "expires_in"))]
	pub(crate) expires_in: i32,
	#[serde(rename(serialize = "refreshExpiresIn", deserialize = "refresh_expires_in"))]
	pub(crate) refresh_expires_in: i32,
	#[serde(rename(serialize = "refreshToken", deserialize = "refresh_token"))]
	refresh_token: String,
	#[serde(rename(serialize = "tokenType", deserialize = "token_type"))]
	token_type: String,
	#[serde(rename(serialize = "notBeforePolicy", deserialize = "not-before-policy"))]
	// NB! Special kebab-case from OIDC-server
	not_before_policy: i32,
	#[serde(rename(serialize = "sessionState", deserialize = "session_state"))]
	session_state: String,
	scope: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ExpireInfo {
	pub(crate) expires_at: u128,
	pub(crate) refresh_expires_at: u128,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub(crate) struct UserInfo {
	sub: String,
	name: String,
	groups: Vec<String>,
	#[serde(rename(serialize = "preferredUsername", deserialize = "preferred_username"))]
	preferred_username: String,
	#[serde(rename(serialize = "givenName", deserialize = "given_name"))]
	given_name: String,
	#[serde(rename(serialize = "familyName", deserialize = "family_name"))]
	family_name: String,
	email: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub(crate) struct TokenResponseWithoutRefresh {
	#[serde(rename(serialize = "accessToken", deserialize = "access_token"))]
	pub(crate) access_token: String,
	#[serde(rename(serialize = "expiresIn", deserialize = "expires_in"))]
	pub(crate) expires_in: i32,
	#[serde(rename(serialize = "tokenType", deserialize = "token_type"))]
	token_type: String,
	#[serde(rename(serialize = "notBeforePolicy", deserialize = "not-before-policy"))]
	// NB! Special kebab-case from OIDC-server
	not_before_policy: i32,
	scope: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RequiredEnvironmentVariables {
	pub(crate) vault_base_url: &'static str,
	pub(crate) vault_role_id: &'static str,
	pub(crate) vault_secret_id: &'static str,
	pub(crate) sentry_url: &'static str,
	pub(crate) sentry_environment: &'static str,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all(serialize = "camelCase", deserialize = "SCREAMING_SNAKE_CASE"))]
// "SCREAMING_SNAKE_CASE" is what we use in Vault, and we send "camelCase" to frontend
pub struct SecretVariables {
	pub(crate) papi_path: String,
	pub(crate) oidc_base_url: String,
	pub(crate) oidc_client_id: String,
	pub(crate) oidc_client_secret: String,
	pub(crate) oidc_tekst_base_url: String,
	pub(crate) oidc_tekst_client_id: String,
	pub(crate) oidc_tekst_client_secret: String,
	pub(crate) s3_access_key_id: String,
	pub(crate) s3_secret_access_key: String,
	pub(crate) s3_url: String,
	pub(crate) s3_bucket_name: String,
	pub(crate) s3_region: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all(serialize = "camelCase"))]
// We send "camelCase" to frontend
pub struct TransferProgress {
	pub(crate) directory: String,
	pub(crate) page_nr: usize,
	pub(crate) total_pages: usize,
}
