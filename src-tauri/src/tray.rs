use tauri::menu::MenuBuilder;
use tauri::{
	Manager, Runtime,
	menu::MenuItem,
	tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};

pub fn create_tray<R: Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<()> {
	let open_i = MenuItem::with_id(app, "open", "Open", true, None::<&str>)?;
	let hide_i = MenuItem::with_id(app, "hide", "Hide", true, None::<&str>)?;
	let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

	let menu = MenuBuilder::new(app)
		.items(&[&open_i, &hide_i])
		.separator()
		.item(&quit_i)
		.build()?;

	// NOTE (Windows 11): if the tray icon is hidden inside the notification-area
	// overflow chevron ("^"), click events are silently dropped by Windows. Only
	// hover/move events are delivered. Users must promote the icon to the
	// always-visible strip via Settings → Personalization → Taskbar → Other
	// system tray icons. Root cause: `tray-icon` (as of 0.22.0) registers the
	// Shell_NotifyIcon with the legacy version (no `NIM_SETVERSION(NOTIFYICON_VERSION_4)`),
	// and Win11 only forwards clicks from the overflow to v4-registered icons.
	// See upstream issue: <link-to-issue-once-filed>.
	let _ = TrayIconBuilder::with_id("tray")
		.icon(app.default_window_icon().unwrap().clone())
		.menu(&menu)
		.show_menu_on_left_click(false)
		.on_menu_event(|app, event| {
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

	Ok(())
}
