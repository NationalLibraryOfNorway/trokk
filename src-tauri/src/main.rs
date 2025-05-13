// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use std::borrow::Cow;
#[cfg(feature = "debug-mock")]
use std::env;
use dotenv::dotenv;

// This setup differs from the standard Tauri setup, as we want to use tokio runtime and Sentry
// See sentry docs for details: https://docs.sentry.io/platforms/rust/#async-main-function
fn main() {
	dotenv().ok();

	// Initialize Sentry
	#[cfg(feature = "debug-mock")]
	let environment = env::var("RUST_SENTRY_ENVIRONMENT")
		.map(Cow::from)
		.unwrap_or_else(|_| Cow::from("mock-environment"));

	#[cfg(not(feature = "debug-mock"))]
	let environment = Some(Cow::from(env!("RUST_SENTRY_ENVIRONMENT")));

	#[cfg(feature = "debug-mock")]
	let dsn = env::var("RUST_SENTRY_DSN").unwrap_or_else(|_| {
		panic!("RUST_SENTRY_DSN environment variable is not set.");
	});

	#[cfg(not(feature = "debug-mock"))]
	let dsn = env!("RUST_SENTRY_DSN");

	let _guard = sentry::init((
		dsn,
		sentry::ClientOptions {
			release: sentry::release_name!(),
			environment: Some(environment),
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