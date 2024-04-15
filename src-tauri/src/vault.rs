use vaultrs::client::{VaultClient, VaultClientSettingsBuilder};
use vaultrs::kv2;
use vaultrs_login::engines::approle::AppRoleLogin;
use vaultrs_login::LoginClient;

use crate::SecretVariables;
use crate::ENVIRONMENT_VARIABLES;

pub(crate) async fn fetch_secrets_from_vault() -> Result<SecretVariables, String> {
	// TODO Add better error handling
	let mut client = VaultClient::new(
		VaultClientSettingsBuilder::default()
			.address(ENVIRONMENT_VARIABLES.vault_base_url)
			.build()
			.unwrap(),
	)
	.unwrap();

	// Login using AppRole method
	let role_id = String::from(ENVIRONMENT_VARIABLES.vault_role_id);
	let secret_id = String::from(ENVIRONMENT_VARIABLES.vault_secret_id);
	let login = AppRoleLogin { role_id, secret_id };

	client.login("approle", &login).await.unwrap(); // Token is automatically set to client

	// Use the client to interact with the Vault API
	let secret: SecretVariables = kv2::read(&client, "kv/team/text/", "trokk-stage")
		.await
		.unwrap();

	Ok(secret)
}
