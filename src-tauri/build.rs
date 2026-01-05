#[cfg(target_os = "windows")]
use std::{env, fs, path::{Path, PathBuf}};

#[cfg(target_os = "windows")]
fn copy_dir_recursive(src: &Path, dst: &Path) -> std::io::Result<()> {
	if !src.exists() {
		return Ok(());
	}
	fs::create_dir_all(dst)?;
	for entry in fs::read_dir(src)? {
		let entry = entry?;
		let file_type = entry.file_type()?;
		let from = entry.path();
		let to = dst.join(entry.file_name());
		if file_type.is_dir() {
			copy_dir_recursive(&from, &to)?;
		} else {
			// overwrite to make builds repeatable
			let _ = fs::remove_file(&to);
			fs::copy(&from, &to)?;
		}
	}
	Ok(())
}

#[cfg(target_os = "windows")]
fn staged_vips_dir() -> PathBuf {
	// build.rs runs with CWD=src-tauri
	PathBuf::from("installer").join("windows").join("vips")
}

#[cfg(target_os = "windows")]
fn bundle_vips_dlls() {
	// Bundling happens via `bundle.resources` in tauri.conf.json.
	// We keep this function as a best-effort helper for any legacy bundling flow,
	// but it must never fail the build if TAURI_BUNDLE_OUT_DIR is missing.
	let staged = staged_vips_dir();
	if !staged.is_dir() {
		println!("cargo:warning=No staged libvips folder found at {:?}. Skipping bundling.", staged);
		return;
	}

	let out_dir = match env::var_os("TAURI_BUNDLE_OUT_DIR") {
		Some(v) => PathBuf::from(v),
		None => {
			println!(
				"cargo:warning=TAURI_BUNDLE_OUT_DIR not set; skipping legacy libvips copy (bundle.resources will handle packaging)."
			);
			return;
		}
	};

	let dest = out_dir.join("vips");
	if let Err(e) = copy_dir_recursive(&staged, &dest) {
		println!(
			"cargo:warning=Failed to copy libvips runtime from {:?} to {:?}: {}",
			staged, dest, e
		);
		return;
	}

	println!(
		"cargo:warning=Bundled libvips runtime from {:?} to {:?}",
		staged, dest
	);
}

#[cfg(not(target_os = "windows"))]
fn bundle_vips_dlls() {}

fn main() {
	bundle_vips_dlls();
	tauri_build::build()
}
