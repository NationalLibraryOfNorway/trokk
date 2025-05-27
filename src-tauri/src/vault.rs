#[cfg(not(feature = "debug-mock" ))]
use vaultrs::client::{VaultClient, VaultClientSettingsBuilder};
#[cfg(not(feature = "debug-mock" ))]
use vaultrs::error::ClientError;
#[cfg(not(feature = "debug-mock" ))]
use vaultrs::kv2;
#[cfg(not(feature = "debug-mock" ))]
use vaultrs_login::engines::approle::AppRoleLogin;
#[cfg(not(feature = "debug-mock" ))]
use vaultrs_login::LoginClient;
#[cfg(not(feature = "debug-mock" ))]
use crate::SecretVariables;
#[cfg(not(feature = "debug-mock" ))]
use crate::ENVIRONMENT_VARIABLES;

#[cfg(not(feature = "debug-mock" ))]
pub(crate) async fn fetch_secrets_from_vault() -> Result<SecretVariables, ClientError> {
	let mut client = VaultClient::new(
		VaultClientSettingsBuilder::default()
			.address(ENVIRONMENT_VARIABLES.vault_base_url)
			.build()
			.unwrap(),
	)?;

	// Login using AppRole method
	let role_id = String::from(ENVIRONMENT_VARIABLES.vault_role_id);
	let secret_id = String::from(ENVIRONMENT_VARIABLES.vault_secret_id);
	let login = AppRoleLogin { role_id, secret_id };

	client.login("approle", &login).await?; // Token is automatically set to client

	// Use the client to interact with the Vault API
	let secrets: SecretVariables =
		kv2::read(&client, "secret/v1/application/k8s/tekst/", "trokk-stage").await?; // TODO set dynamically for prod/stage

	Ok(secrets)
}
