// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
extern crate core;

use core::panic::PanicInfo;
use sentry::integrations::panic;
use std::borrow::Cow;

// This setup differs from the standard Tauri setup, as we want to use tokio runtime and Sentry
// See sentry docs for details: https://docs.sentry.io/platforms/rust/#async-main-function
fn main() {
	// Initialize Sentry
	let _guard = sentry::init((
		env!("SENTRY_URL"),
		sentry::ClientOptions {
			release: sentry::release_name!(),
			environment: Some(Cow::from(env!("SENTRY_ENVIRONMENT"))),
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
