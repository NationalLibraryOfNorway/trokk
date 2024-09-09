/*use tauri::{
	AppHandle, CustomMenuItem, GlobalWindowEvent, RunEvent, SystemTray, SystemTrayEvent,
	SystemTrayMenu, SystemTrayMenuItem,
};

pub fn get_system_tray() -> Tray {
	let open = CustomMenuItem::new("open".to_string(), "Open");
	let hide = CustomMenuItem::new("hide".to_string(), "Hide");
	let quit = CustomMenuItem::new("quit".to_string(), "Quit");
	let tray_menu = SystemTrayMenu::new()
		.add_item(open)
		.add_item(hide)
		.add_native_item(SystemTrayMenuItem::Separator)
		.add_item(quit);

	SystemTray::new().with_menu(tray_menu).with_tooltip("Trøkk")
}

pub fn system_tray_event_handler() -> fn(&AppHandle, SystemTrayEvent) {
	|app, event| {
		if let SystemTrayEvent::MenuItemClick { id, .. } = event {
			match id.as_str() {
				"quit" => {
					std::process::exit(0);
				}
				"hide" => {
					let window = app.get_window("main").unwrap();
					window.hide().unwrap();
				}
				"open" => {
					let window = app.get_window("main").unwrap();
					window.show().unwrap();
				}
				_ => {}
			}
		}
	}
}

pub fn run_frontend_in_background_on_close() -> fn(GlobalWindowEvent) {
	|event| {
		if let tauri::WindowEvent::CloseRequested { api, .. } = event.event() {
			event.window().hide().unwrap();
			api.prevent_close();
		}
	}
}

pub fn run_backend_in_background_on_close() -> fn(&AppHandle, RunEvent) {
	|_app_handle, event| {
		if let RunEvent::ExitRequested { api, .. } = event {
			api.prevent_exit();
		}
	}
}
*/
