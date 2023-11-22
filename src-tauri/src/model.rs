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
#[serde(rename_all = "camelCase")]
pub struct RequiredEnvironmentVariables {
	pub(crate) papi_path: String,
	pub(crate) oidc_base_url: String,
	pub(crate) oidc_client_id: String,
	pub(crate) oidc_client_secret: String,
}
