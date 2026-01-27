// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(not(feature = "debug-mock"))]
use std::borrow::Cow;

// This setup differs from the standard Tauri setup, as we want to use tokio runtime and Sentry
// See sentry docs for details: https://docs.sentry.io/platforms/rust/#async-main-function
fn main() {
	// Initialize Sentry
	#[cfg(not(feature = "debug-mock"))]
	let _guard = sentry::init((
		env!("RUST_SENTRY_DSN"),
		sentry::ClientOptions {
			release: sentry::release_name!(),
			environment: Some(Cow::from(env!("RUST_SENTRY_ENVIRONMENT"))),
			debug: true,
			..Default::default()
		},
	));

	tokio::runtime::Builder::new_multi_thread()
		.enable_all()
		.build()
		.unwrap()
		.block_on(async {
			app_lib::run();
		});
}
