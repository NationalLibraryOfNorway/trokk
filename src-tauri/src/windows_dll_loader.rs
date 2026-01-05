//! Windows-only DLL preloader.
//!
//! When we bundle native dependencies (like libvips) next to the executable,
//! Windows will not always find them unless we adjust the DLL search path.
//!
//! The simplest reliable approach is:
//! - Put DLLs in a known folder inside the installation directory
//! - Add that folder to the DLL search path via `AddDllDirectory`
//!
//! This module is a no-op on non-Windows.

#[cfg(target_os = "windows")]
pub fn add_app_dll_dir() {
	use std::ffi::OsStr;
	use std::os::windows::ffi::OsStrExt;

	// SAFETY: Windows API call.
	unsafe {
		// Enable `AddDllDirectory` behavior.
		// If this fails, we continue anyway; worst case: DLL load fails later.
		let _ = windows_sys::Win32::System::LibraryLoader::SetDefaultDllDirectories(
			windows_sys::Win32::System::LibraryLoader::LOAD_LIBRARY_SEARCH_DEFAULT_DIRS
				| windows_sys::Win32::System::LibraryLoader::LOAD_LIBRARY_SEARCH_USER_DIRS,
		);
	}

	let exe_dir = match std::env::current_exe()
		.ok()
		.and_then(|p| p.parent().map(|p| p.to_path_buf()))
	{
		Some(p) => p,
		None => return,
	};

	// We’ll bundle DLLs into a `vips` folder next to the exe.
	let dll_dir = exe_dir.join("vips");
	if !dll_dir.is_dir() {
		return;
	}

	let widestr: Vec<u16> = OsStr::new(&dll_dir)
		.encode_wide()
		.chain(std::iter::once(0))
		.collect();

	unsafe {
		let _cookie = windows_sys::Win32::System::LibraryLoader::AddDllDirectory(widestr.as_ptr());
		// cookie can be stored if we want RemoveDllDirectory on exit; not required.
	}
}

#[cfg(not(target_os = "windows"))]
pub fn add_app_dll_dir() {}

