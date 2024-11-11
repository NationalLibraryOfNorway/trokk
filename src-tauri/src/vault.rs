use vaultrs::client::{VaultClient, VaultClientSettingsBuilder};
use vaultrs::error::ClientError;
use vaultrs::kv2;
use vaultrs_login::engines::approle::AppRoleLogin;
use vaultrs_login::LoginClient;

use crate::SecretVariables;
use crate::ENVIRONMENT_VARIABLES;

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
	let secrets: SecretVariables = kv2::read(&client, "kv/team/text/", "trokk-stage").await?; // TODO set dynamically for prod/stage

	println!("{:?}", secrets);
	Ok(secrets)
}
