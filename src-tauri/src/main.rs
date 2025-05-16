// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::borrow::Cow;
use std::env;

// This setup differs from the standard Tauri setup, as we want to use tokio runtime and Sentry
// See sentry docs for details: https://docs.sentry.io/platforms/rust/#async-main-function
fn main() {
	// Initialize Sentry
	let environment: Option<Cow<'static, str>> = {
		#[cfg(feature = "debug-mock")]
		{
			Some(
				env::var("RUST_SENTRY_ENVIRONMENT")
					.map(Cow::from)
					.unwrap_or_else(|_| Cow::from("mock-environment")),
			)
		}

		#[cfg(not(feature = "debug-mock"))]
		{
			Some(Cow::from(env!("RUST_SENTRY_ENVIRONMENT")))
		}
	};

	let dsn: &str = {
		#[cfg(feature = "debug-mock")]
		{
			&env::var("RUST_SENTRY_DSN").unwrap_or_else(|_| {
				panic!("RUST_SENTRY_DSN environment variable is not set.")
			})
		}

		#[cfg(not(feature = "debug-mock"))]
		{
			env!("RUST_SENTRY_DSN")
		}
	};

	let _guard = sentry::init((
		dsn,
		sentry::ClientOptions {
			release: sentry::release_name!(),
			environment,
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
