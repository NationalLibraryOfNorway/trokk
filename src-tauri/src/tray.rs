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

	// IMPORTANT: do NOT add a `trayIcon` block to `tauri.conf.json` — Tauri will
	// auto-create a second (bare, handler-less) tray icon from it that races with
	// this one. Symptom: two tray icons, one unresponsive.
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
			} = event && let Some(window) = tray.app_handle().get_webview_window("main")
			{
				let _ = window.show();
				let _ = window.unminimize();
				let _ = window.set_focus();
			}
		})
		.tooltip("Trøkk")
		.build(app);

	Ok(())
}
