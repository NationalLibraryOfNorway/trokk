use tauri::menu::MenuBuilder;
use tauri::{
	menu::MenuItem,
	tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
	Manager, Runtime,
};

pub fn create_tray<R: Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<()> {
	let open_i = MenuItem::with_id(app, "open", "Open", true, None::<&str>)?;
	let hide_i = MenuItem::with_id(app, "hide", "Hide", true, None::<&str>)?;
	let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
	//let menu = Menu::with_items(app, &[&open_i, &hide_i, &quit_i])?;
	let menu = MenuBuilder::new(app)
		.items(&[&open_i, &hide_i])
		.separator()
		.item(&quit_i)
		.build()?;

	let _ = TrayIconBuilder::with_id("tray")
		.icon(app.default_window_icon().unwrap().clone())
		.menu(&menu)
		.menu_on_left_click(false)
		.on_menu_event(move |app, event| match event.id.as_ref() {
			"quit" => {
				app.exit(0);
			}
			"hide" => {
				let window = app.get_webview_window("main").unwrap();
				window.hide().unwrap()
			}
			"open" => {
				let window = app.get_webview_window("main").unwrap();
				window.show().unwrap();
			}
			// Add more events here
			_ => {}
		})
		.on_tray_icon_event(|tray, event| {
			if let TrayIconEvent::Click {
				button: MouseButton::Left,
				button_state: MouseButtonState::Up,
				..
			} = event
			{
				let app = tray.app_handle();
				if let Some(window) = app.get_webview_window("main") {
					let _ = window.show();
					let _ = window.set_focus();
				}
			}
		})
		.tooltip("Trøkk")
		.build(app);

	Ok(())
}
