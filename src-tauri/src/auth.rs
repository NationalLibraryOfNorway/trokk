use std::borrow::Cow;
use std::collections::HashMap;
use std::error::Error;
use std::time::{SystemTime, UNIX_EPOCH};

use reqwest::Client;
use tauri::Window;
use tauri_plugin_oauth::{OauthConfig, start_with_config};
use url::Url;

use crate::get_secret_variables;
use crate::model::{
	AuthenticationResponse, ExpireInfo, TokenResponse, TokenResponseWithoutRefresh, UserInfo,
};

pub(crate) fn log_in_with_server_redirect(window: Window) -> Result<u16, String> {
	start_with_config(
		OauthConfig {
			response: Some(Cow::Borrowed(
				"
				<html><body>Login complete! Closing</body></html>
				",
			)),
			ports: None,
		},
		move |url: String| {
			let parameter_map: HashMap<String, String> = Url::parse(&url)
				.unwrap()
				.query_pairs()
				.into_owned()
				.collect();

			tauri::async_runtime::block_on(async {
				// Secrets already fetched from frontend, so unwrap is safe as it is in the OnceCell cache
				let secrets = get_secret_variables().await.unwrap();
				let mut redirect_url = url.split('?').next().unwrap().to_string();
				if redirect_url.ends_with('/') {
					redirect_url.pop(); // remove trailing '/'
				}
				let body = format!(
					"client_id={}&client_secret={}&code={}&grant_type=authorization_code&redirect_uri={}",
					secrets.oidc_client_id,
					secrets.oidc_client_secret,
					parameter_map.get("code").unwrap(),
					redirect_url
				);
				let client = Client::new();
				let authentication_response = create_token(client, body).await;
				let _ = window.emit("token_exchanged", authentication_response);
			});
		},
	)
	.map_err(|e| e.to_string())
}

pub(crate) async fn refresh_token(refresh_token: String) -> AuthenticationResponse {
	// Secrets already fetched from frontend, so unwrap is safe as it is in the OnceCell cache
	let secrets = get_secret_variables().await.unwrap();
	let client = Client::new();
	let body = format!(
		"client_id={}&client_secret={}&grant_type=refresh_token&refresh_token={}",
		secrets.oidc_client_id, secrets.oidc_client_secret, refresh_token
	);
	create_token(client, body).await
}

pub(crate) async fn get_access_token_for_papi() -> Result<String, Box<dyn Error>> {
	// Secrets already fetched from frontend, so unwrap is safe as it is in the OnceCell cache
	let secrets = get_secret_variables().await.unwrap();
	let client = Client::new();
	let body = format!(
		"client_id={}&client_secret={}&grant_type=client_credentials",
		secrets.oidc_tekst_client_id, secrets.oidc_tekst_client_secret
	);

	let res = client
		.post(format!("{}{}", secrets.oidc_tekst_base_url, "/token"))
		.header("Content-Type", "application/x-www-form-urlencoded")
		.body(body)
		.send()
		.await;

	let token_response: TokenResponseWithoutRefresh = serde_json::from_str(&res?.text().await?)?;
	Ok(token_response.access_token)
}

async fn create_token(client: Client, body: String) -> AuthenticationResponse {
	// Secrets already fetched from frontend, so unwrap is safe as it is in the OnceCell cache
	let secrets = get_secret_variables().await.unwrap();
	let time_now = SystemTime::now()
		.duration_since(UNIX_EPOCH)
		.expect("Time went backwards")
		.as_millis();

	let res = client
		.post(format!("{}{}", secrets.oidc_base_url, "/token"))
		.header("Content-Type", "application/x-www-form-urlencoded")
		.body(body)
		.send()
		.await;
	let token_response: TokenResponse =
		serde_json::from_str(&res.unwrap().text().await.unwrap()).unwrap();

	// For easier use in Frontend
	let expire_info: ExpireInfo = ExpireInfo {
		expires_at: time_now + (token_response.expires_in as u128 * 1000), // convert seconds to milliseconds
		refresh_expires_at: time_now + (token_response.refresh_expires_in as u128 * 1000), // convert seconds to milliseconds
	};

	let user_response = client
		.get(format!("{}{}", secrets.oidc_base_url, "/userinfo"))
		.header(
			"Authorization",
			format!("Bearer {}", token_response.access_token),
		)
		.send()
		.await;
	let user_info: UserInfo =
		serde_json::from_str(&user_response.unwrap().text().await.unwrap()).unwrap();

	let authentication_response: AuthenticationResponse = AuthenticationResponse {
		token_response,
		expire_info,
		user_info,
	};
	authentication_response
}
