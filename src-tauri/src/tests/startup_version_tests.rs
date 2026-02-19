#[cfg(not(feature = "debug-mock"))]
use crate::evaluate_desktop_version_gate;
#[cfg(not(feature = "debug-mock"))]
use crate::evaluate_startup_version_policy;
#[cfg(not(feature = "debug-mock"))]
use crate::model::StartupVersionStatus;

#[cfg(not(feature = "debug-mock"))]
#[test]
fn test_startup_version_policy_major_update_is_blocking() {
	let policy = evaluate_startup_version_policy("0.1.0", "1.0.0").unwrap();
	assert_eq!(policy.status, StartupVersionStatus::MajorBlocking);
	assert!(!policy.auto_login_allowed);
	assert!(policy.startup_version_message.is_some());
	assert!(
		policy
			.startup_version_message
			.unwrap()
			.contains("Ny hovedversjon er tilgjengelig")
	);
}

#[cfg(not(feature = "debug-mock"))]
#[test]
fn test_startup_version_policy_minor_update_is_blocking() {
	let policy = evaluate_startup_version_policy("0.1.0", "0.2.0").unwrap();
	assert_eq!(policy.status, StartupVersionStatus::MinorBlocking);
	assert!(!policy.auto_login_allowed);
	assert!(policy.startup_version_message.is_some());
	assert!(
		policy
			.startup_version_message
			.unwrap()
			.contains("Ny delversjon er tilgjengelig")
	);
}

#[cfg(not(feature = "debug-mock"))]
#[test]
fn test_startup_version_policy_patch_update_requires_manual_login() {
	let policy = evaluate_startup_version_policy("0.1.0", "0.1.1").unwrap();
	assert_eq!(policy.status, StartupVersionStatus::PatchAvailable);
	assert!(!policy.auto_login_allowed);
	assert!(policy.startup_version_message.is_some());
	assert!(
		policy
			.startup_version_message
			.unwrap()
			.contains("Du må logge inn manuelt")
	);
}

#[cfg(not(feature = "debug-mock"))]
#[test]
fn test_desktop_version_gate_major_update_is_blocking() {
	let result = evaluate_desktop_version_gate("0.1.0", "1.0.0").unwrap();
	assert_eq!(result.status, StartupVersionStatus::MajorBlocking);
	assert!(result.is_blocking);
	assert!(!result.is_patch);
	assert!(
		result
			.message
			.unwrap()
			.contains("Ny hovedversjon er tilgjengelig")
	);
}

#[cfg(not(feature = "debug-mock"))]
#[test]
fn test_desktop_version_gate_minor_update_is_blocking() {
	let result = evaluate_desktop_version_gate("0.1.0", "0.2.0").unwrap();
	assert_eq!(result.status, StartupVersionStatus::MinorBlocking);
	assert!(result.is_blocking);
	assert!(!result.is_patch);
	assert!(
		result
			.message
			.unwrap()
			.contains("Ny delversjon er tilgjengelig")
	);
}

#[cfg(not(feature = "debug-mock"))]
#[test]
fn test_desktop_version_gate_patch_update_is_not_blocking() {
	let result = evaluate_desktop_version_gate("0.1.0", "0.1.1").unwrap();
	assert_eq!(result.status, StartupVersionStatus::PatchAvailable);
	assert!(!result.is_blocking);
	assert!(result.is_patch);
	assert!(
		result
			.message
			.unwrap()
			.contains("Ny patch-versjon er tilgjengelig")
	);
}
