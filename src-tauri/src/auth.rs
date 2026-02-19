use reqwest::Client;
use sentry::{Breadcrumb, Level, add_breadcrumb};
use std::borrow::Cow;
use std::collections::HashMap;
use tauri::Emitter;
use tauri::Window;
use tauri_plugin_oauth::{OauthConfig, start_with_config};
use url::Url;

#[cfg(not(feature = "debug-mock"))]
use std::time::Duration;
#[cfg(not(feature = "debug-mock"))]
use std::time::{SystemTime, UNIX_EPOCH};

use crate::get_cached_secret_variables;
use crate::model::{AuthenticationResponse, ExpireInfo, TokenResponse, UserInfo};
#[cfg(not(feature = "debug-mock"))]
use crate::model::{SecretVariables, TokenResponseWithoutRefresh};

pub(crate) fn log_in_with_server_redirect(window: Window) -> Result<u16, String> {
	start_with_config(
		OauthConfig {
			response: Some(Cow::Borrowed(
				r#"<!doctype html>
<html lang="no">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Fullfører innlogging</title>
    <style>
      :root {
        color-scheme: light;
      }
      body {
        margin: 0;
        height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: #ffffff;
        color: #111827;
        font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
      }
      h1 {
        margin: 0;
        font-size: 22px;
        font-weight: 600;
        letter-spacing: 0.2px;
      }
      .spinner {
        margin-top: 16px;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 4px solid rgba(17, 24, 39, 0.15);
        border-top-color: rgba(17, 24, 39, 0.8);
        animation: spin 900ms linear infinite;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>
  </head>
  <body>
    <h1>Fullfører innlogging</h1>
    <div class="spinner" aria-label="Laster"></div>
  </body>
</html>"#,
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
				let secrets = get_cached_secret_variables().await.unwrap();
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
	let secrets = get_cached_secret_variables().await.unwrap();
	let client = Client::new();
	let body = format!(
		"client_id={}&client_secret={}&grant_type=refresh_token&refresh_token={}",
		secrets.oidc_client_id, secrets.oidc_client_secret, refresh_token
	);
	create_token(client, body).await
}
#[cfg(not(feature = "debug-mock"))]
pub(crate) async fn get_access_token_for_papi() -> Result<String, String> {
	// Secrets already fetched from frontend, so unwrap is safe as it is in the OnceCell cache
	let secrets = get_cached_secret_variables().await.unwrap();
	get_access_token_for_papi_with_secrets(secrets).await
}

#[cfg(not(feature = "debug-mock"))]
pub(crate) async fn get_access_token_for_papi_with_secrets(
	secrets: &SecretVariables,
) -> Result<String, String> {
	let client = Client::builder()
		.timeout(Duration::from_secs(15))
		.build()
		.map_err(|e| format!("Kunne ikke initialisere HTTP-klient: {e}"))?;
	let body = format!(
		"client_id={}&client_secret={}&grant_type=client_credentials",
		secrets.oidc_tekst_client_id, secrets.oidc_tekst_client_secret
	);

	let res = client
		.post(format!("{}{}", secrets.oidc_tekst_base_url, "/token"))
		.header("Content-Type", "application/x-www-form-urlencoded")
		.body(body)
		.send()
		.await
		.map_err(|e| format!("Kunne ikke hente autentiseringstoken: {e}"))?;
	if !res.status().is_success() {
		return Err(format!(
			"Kunne ikke hente autentiseringstoken. Status: {}",
			res.status()
		));
	}
	let body = res
		.text()
		.await
		.map_err(|e| format!("Kunne ikke lese token-respons: {e}"))?;
	parse_papi_token_response(&body)
}

#[cfg(not(feature = "debug-mock"))]
pub(crate) fn parse_papi_token_response(body: &str) -> Result<String, String> {
	let token_response: TokenResponseWithoutRefresh =
		serde_json::from_str(body).map_err(|e| format!("Kunne ikke tolke token-respons: {e}"))?;
	Ok(token_response.access_token)
}
#[cfg(feature = "debug-mock")]
async fn create_token(_client: Client, _body: String) -> AuthenticationResponse {
	AuthenticationResponse {
		token_response: TokenResponse::mock(),
		expire_info: ExpireInfo {
			expires_at: 9999999999999,
			refresh_expires_at: 9999999999999,
		},
		user_info: UserInfo::mock(),
	}
}

#[cfg(not(feature = "debug-mock"))]
async fn create_token(client: Client, body: String) -> AuthenticationResponse {
	// Secrets already fetched from frontend, so unwrap is safe as it is in the OnceCell cache
	let secrets = get_cached_secret_variables().await.unwrap();

	let time_now = SystemTime::now()
		.duration_since(UNIX_EPOCH)
		.expect("Time went backwards")
		.as_millis();

	// For debugging av treg tokenhenting. Remove when stable.
	add_breadcrumb(Breadcrumb {
		message: Some("Getting token".into()),
		level: Level::Info,
		..Default::default()
	});
	let res = client
		.post(format!("{}{}", secrets.oidc_base_url, "/token"))
		.header("Content-Type", "application/x-www-form-urlencoded")
		.body(body)
		.send()
		.await;
	let token_response: TokenResponse =
		serde_json::from_str(&res.unwrap().text().await.unwrap()).unwrap();

	add_breadcrumb(Breadcrumb {
		message: Some("Received token response".into()),
		level: Level::Info,
		..Default::default()
	});
	sentry::capture_message("Token creation successful", Level::Info);

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
