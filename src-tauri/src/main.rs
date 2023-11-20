// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod model;

use crate::model::{AuthenticationResponse, RequiredEnvironmentVariables, TokenResponse, UserInfo};
use std::collections::HashMap;
use std::ffi::OsString;
use std::borrow::Cow;
use gethostname::gethostname;
use tauri::Manager;
use tauri::{Window};
use tauri_plugin_oauth::{OauthConfig, start_with_config};
use url::Url;

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn get_hostname() -> Result<String, OsString> {
    return gethostname().into_string()
}

#[tauri::command]
fn get_required_env_variables() -> RequiredEnvironmentVariables {
    RequiredEnvironmentVariables {
        papi_path: env!("PAPI_PATH").parse().unwrap(),
        oicd_url: env!("OICD_URL").parse().unwrap(),
        oicd_client_id: env!("OICD_CLIENT_ID").parse().unwrap(),
        oicd_client_secret: env!("OICD_CLIENT_SECRET").parse().unwrap(),
    }
}

#[tauri::command]
async fn log_in(window: Window) -> Result<u16, String> {
    start_with_config(
        OauthConfig{
            response: Some(
                Cow::Borrowed("
                <html><body>Login complete! Closing</body></html>
                ")
            ),
            ports: None
        },
        move |url: String| {
            let parameter_map: HashMap<String, String> = Url::parse(&url).unwrap().query_pairs().into_owned().collect();
            let env_variables: RequiredEnvironmentVariables = get_required_env_variables();

            tauri::async_runtime::block_on(
                async {
                    let mut redirect_url = url.split('?').next().unwrap().to_string();
                    redirect_url.pop(); // remove trailing '/'

                    let body = format!(
                        "client_id={}&client_secret={}&code={}&grant_type=authorization_code&redirect_uri={}",
                        env_variables.oicd_client_id,
                        env_variables.oicd_client_secret,
                        parameter_map.get("code").unwrap(),
                        redirect_url
                    );

                    let client = reqwest::Client::new();
                    let res = client.post(format!("{}{}", env_variables.oicd_url, "/token"))
                        .header("Content-Type", "application/x-www-form-urlencoded")
                        .body(body)
                        .send()
                        .await;
                    let token_response: TokenResponse = serde_json::from_str(&res.unwrap().text().await.unwrap()).unwrap();


                    let user_response = client.get(format!("{}{}", env_variables.oicd_url, "/userinfo"))
                        .header("Authorization", format!("Bearer {}", token_response.access_token))
                        .send()
                        .await;
                    let user_info: UserInfo = serde_json::from_str(&user_response.unwrap().text().await.unwrap()).unwrap();

                    let authentication_response: AuthenticationResponse = AuthenticationResponse{
                        token_response,
                        user_info
                    };
                    let _ = window.emit("token_exchanged", authentication_response);
                }
            );
        }
    )
        .map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            #[cfg(debug_assertions)]
            app.get_window("main").unwrap().open_devtools(); // `main` is the first window from tauri.conf.json without an explicit label
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_hostname, get_required_env_variables, log_in])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
