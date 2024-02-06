use crate::system_tray::get_system_tray;

#[test]
fn test_get_system_tray() {
	let system_tray = get_system_tray();
	let menu = system_tray.menu.unwrap();
	// Separator counts as one item
	assert_eq!(menu.items.len(), 4);
}
