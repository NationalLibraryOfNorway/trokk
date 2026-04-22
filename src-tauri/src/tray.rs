use std::fs::OpenOptions;
use std::io::Write;
use tauri::menu::MenuBuilder;
use tauri::{
	Manager, Runtime,
	menu::MenuItem,
	tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};

/// TEMP diagnostic. Appends a line to `%TEMP%/trokk-tray.log` (Windows) or
/// `$TMPDIR/trokk-tray.log` otherwise. Remove once the tray bug is diagnosed.
fn tray_log(msg: &str) {
	let path = std::env::temp_dir().join("trokk-tray.log");
	if let Ok(mut f) = OpenOptions::new().create(true).append(true).open(&path) {
		let _ = writeln!(f, "{msg}");
	}
}

pub fn create_tray<R: Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<()> {
	// TEMP diagnostic: install a raw tray-icon handler BEFORE Tauri does (Tauri
	// sets its own in Builder::build, which on this machine hasn't run yet at
	// plugin/setup time on Windows? This lets us see whether events reach
	// tray-icon at all, independent of Tauri's event-loop plumbing.
	//
	// NOTE: tray-icon's handler is a OnceCell — only the FIRST `set_event_handler`
	// call wins. If Tauri already registered theirs (during Builder::build, which
	// happens before .setup()), our call will be a no-op and this section is
	// harmless. If it *wasn't* set yet, we take over. Either way the log tells us.
	{
		use std::sync::atomic::{AtomicBool, Ordering};
		static INSTALLED: AtomicBool = AtomicBool::new(false);
		if !INSTALLED.swap(true, Ordering::SeqCst) {
			tray_icon::TrayIconEvent::set_event_handler(Some(|e: tray_icon::TrayIconEvent| {
				tray_log(&format!("RAW tray-icon event: {e:?}"));
			}));
			tray_log("RAW tray-icon handler install attempted");
		}
	}

	let open_i = MenuItem::with_id(app, "open", "Open", true, None::<&str>)?;
	let hide_i = MenuItem::with_id(app, "hide", "Hide", true, None::<&str>)?;
	let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

	let menu = MenuBuilder::new(app)
		.items(&[&open_i, &hide_i])
		.separator()
		.item(&quit_i)
		.build()?;

	let result = TrayIconBuilder::with_id("tray")
		.icon(app.default_window_icon().unwrap().clone())
		.menu(&menu)
		.show_menu_on_left_click(false)
		.on_menu_event(|app, event| {
			tray_log(&format!("tauri menu event: {:?}", event.id));
			let Some(window) = app.get_webview_window("main") else {
				return;
			};
			match event.id.as_ref() {
				"quit" => app.exit(0),
				"hide" => {
					let _ = window.hide();
				}
				"open" => {
					let _ = window.show();
					let _ = window.unminimize();
					let _ = window.set_focus();
				}
				_ => {}
			}
		})
		.on_tray_icon_event(|tray, event| {
			tray_log(&format!("tauri tray event: {event:?}"));
			if let TrayIconEvent::Click {
				button: MouseButton::Left,
				button_state: MouseButtonState::Up,
				..
			} = event
			{
				if let Some(window) = tray.app_handle().get_webview_window("main") {
					let _ = window.show();
					let _ = window.unminimize();
					let _ = window.set_focus();
				}
			}
		})
		.tooltip("Trøkk")
		.build(app);

	tray_log(&format!(
		"create_tray: pid={} result={}",
		std::process::id(),
		if result.is_ok() { "ok" } else { "err" }
	));
	let _ = result;
	Ok(())
}
