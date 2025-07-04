<img src="banner.png" alt="trøkk logo" width="500px">

App for minimumsregistrering og filfytting av objekter fra skannemaskiner.
Laget i Tauri med Rust og Svelte.

**NB:** Appen er en prototype som enda er i utvikling. Store endringer vil kunne forekomme.

## Setup for lokal utvikling

Rust og diverse system-avhengigheter må være installert på maskinen.
Se [Tauri prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites/)
eller [rust-lang.org](https://www.rust-lang.org/tools/install) .

For installasjon av nødvendige pakker og oppstart:

```bash
    npm ci
    npm run tauri dev
```

Appen er nå hardkodet til å hente filer fra ```$DOCUMENT/trokk/files```, så lag en mappe der med noen filer.

### Telemetri

Appen bruker Sentry for feillogging.
Dette medfører at konsollen blir wrappet i en Sentry-klient.
Som gjør at alle `console.<ANYTHING>` ser ut som det kommer fra Sentry-pakken.

For å få reelle linjer i konsollen, kommenter ut instrumenteringen i `src/main.tsx`:

### Krevde environment variabler

Sett disse environment variablene for å få appen til å fungere:

| Variabel                  | Beskrivelse                                            |
|---------------------------|--------------------------------------------------------|
| `VAULT_BASE_URL`          | URL til VAULT instans.                                 |
| `VAULT_ROLE_ID`           | Vault rolle_id for app-role innlogging.                |
| `VAULT_SECRET_ID`         | Vault secret_id for app-role innlogging.               |
| `VITE_SENTRY_DSN`         | Generert Sentry URL for React prosjekt (Vite).         |
| `VITE_SENTRY_ENVIRONMENT` | "Environment" string som sendes til Sentry. (for vite) |
| `RUST_SENTRY_DSN`         | Generert Sentry URL for Rust prosjekt.                 |
| `RUST_SENTRY_ENVIRONMENT` | "Environment" string som sendes til Sentry.            |

### Forventede variabler fra Vault

| Variabel                   | Beskrivelse                                                                          |
|----------------------------|--------------------------------------------------------------------------------------|
| `PAPI_PATH`                | URL til API'et vi sender registreringen til.                                         |
| `OIDC_BASE_URL`            | URL til OIDC server (nbauth-realm, inkludert "protocol/openid-connect").             |
| `OIDC_CLIENT_ID`           | Client ID til OIDC server (nbauth-realm)                                             |
| `OIDC_CLIENT_SECRET`       | Client secret til OIDC server (nbauth-realm)                                         |
| `OIDC_TEKST_BASE_URL`      | URL til OIDC server for papi auth (tekst-realm, inkludert "protocol/openid-connect") |
| `OIDC_TEKST_CLIENT_ID`     | Client ID til OIDC server (tekst-realm)                                              |
| `OIDC_TEKST_CLIENT_SECRET` | Client secret til OIDC server (tekst-realm)                                          |
| `S3_ACCESS_KEY_ID`         |                                                                                      |
| `S3_SECRET_ACCESS_KEY`     |                                                                                      |
| `S3_REGION`                |                                                                                      |
| `S3_BUCKET_NAME`           |                                                                                      |
| `S3_URL`                   |                                                                                      |

### Lokal utvikling
For å gjøre lokal utvikling må features flagget debug-mock være aktivert i configurations.
Legg til "command" i configureringen av cargo: "run --no-default-features --features debug-mock"
Samt, legg til environmental variabler nedenfor.

### Lokal utvikling environmental variabler
| Variabel                   | Beskrivelse                                                                          |
|----------------------------|--------------------------------------------------------------------------------------|
| `OIDC_BASE_URL`            | URL til OIDC server (nbauth-realm, inkludert "protocol/openid-connect").             |
| `OIDC_CLIENT_ID`           | Client ID til OIDC server (nbauth-realm)                                             |
| `OIDC_CLIENT_SECRET`       | Client secret til OIDC server (nbauth-realm)                                         |
| `OIDC_TEKST_BASE_URL`      | URL til OIDC server for papi auth (tekst-realm, inkludert "protocol/openid-connect") |
| `OIDC_TEKST_CLIENT_ID`     | Client ID til OIDC server (tekst-realm)                                              |
| `OIDC_TEKST_CLIENT_SECRET` | Client secret til OIDC server (tekst-realm)                                          |

## Vedlikehold

Tekst-teamet på Nasjonalbibliotekets IT-avdeling vedlikeholder **Trøkk**.

Alle kan lage issues, men vi kan ikke garantere at alle blir tatt tak i. Interne behov går foran eksterne forespørsler.
