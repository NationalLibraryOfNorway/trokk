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
			// Right-click is handled natively by the tray-icon crate to pop the
			// menu — do NOT handle it here or the default popup can be suppressed.
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
