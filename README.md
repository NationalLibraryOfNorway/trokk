<img src="banner.png" alt="trøkk logo" width="500px">

App for minimumsregistrering og filfytting av objekter fra skannemaskiner.
Laget i Tauri med Rust og Svelte.

**NB:** Appen er en prototype som enda er i utvikling. Store endringer vil kunne forekomme.

## Setup for lokal utvikling

Rust og diverse system-avhengigheter må være installert på maskinen.
Se [Tauri prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites/)
eller [rust-lang.org](https://www.rust-lang.org/tools/install) .

### libvips (påkrevd)

Appen bruker `libvips` (via Rust-crate `libvips`) for generering av thumbnails/previews og rask bildebehandling.
Det betyr at **native libvips** må være tilgjengelig på maskinen når Rust-koden bygges/kjøres.

**Linux (anbefalt via Nix):** `shell.nix` inkluderer `vips`. Bruk `nix-shell` før du kjører `npm run tauri dev`.

**Linux (uten Nix):** installer `libvips` fra systemets pakkebehandler.

**Windows (utvikling + distribusjon):** du må ha en libvips-distribusjon (DLL-er). Ved distribusjon må disse DLL-ene bundles sammen med appen.

#### Windows: hva må kopieres fra vips-dev?

Hvis du bruker en prebygget zip som `vips-dev-w64-all-8.xx`, er den enkleste og mest robuste regelen:

- Kopier **alle `*.dll`** fra `bin/`
- Kopier hele mappen `bin/vips-modules-<versjon>/`
- (Valgfritt, men anbefalt) kopier `etc/` og `share/` for ImageMagick/poppler osv.

> I praksis betyr det at du kan ta omtrent alt som trengs fra `bin/` i den distribusjonen.

I repoet har vi en staging-løsning for dette:

```bash
./scripts/stage-windows-libvips.sh /path/to/vips-dev-8.xx
```

Dette legger filene i:

- `src-tauri/installer/windows/vips/`

Appen er satt opp til å laste DLL-er fra en `vips/`-mappe ved siden av `.exe` på Windows.

### Kjøring

For installasjon av nødvendige pakker og oppstart:

```bash
npm ci
npm run tauri dev
```

Appen er nå hardkodet til å hente filer fra `$DOCUMENT/trokk/files`, så lag en mappe der med noen filer.

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

### Bygge Windows-binaries (MSI)

Det finnes to måter:

1) **Lokalt på Windows** (anbefalt hvis du bare vil lage en MSI raskt)
2) **Via GitHub Actions** (brukes for release/tag builds)

#### 1) Lokalt på Windows

**Krav**
- Node.js (LTS)
- Rust (MSVC toolchain)
- Visual Studio Build Tools (C++ build tools)
- WiX Toolset (MSI)

**libvips på Windows**

Denne appen bruker `libvips` via FFI, så du må bundle DLL-er sammen med appen.

- Last ned en prebygget zip som `vips-dev-w64-all-8.xx`
- Kjør staging-scriptet (på Linux/mac eller Git Bash/WSL):

```bash
./scripts/stage-windows-libvips.sh /path/to/vips-dev-8.xx
```

Dette fyller `src-tauri/installer/windows/vips/`.

**Bygg**

```bash
npm ci
npm run test
npm run tauri build
```

Resultatet havner typisk under:
- `src-tauri/target/release/bundle/msi/*.msi`

> Viktig: `src-tauri/build.rs` kopierer `installer/windows/vips/` inn i bundle output ved Windows-build.
> Appen forventer at `vips/` ligger ved siden av `.exe` i installasjonen.

#### 2) Via GitHub Actions

Repoet har workflowen `.github/workflows/build.yml` som bygger Windows på en self-hosted runner.
Den trigger på tags som starter med `v` (f.eks `v1.2.3`).

For å bygge:
- push en tag:

```bash
git tag v1.2.3
git push origin v1.2.3
```

Deretter vil workflowen kjøre `tauri-action` og legge artifacts i `src-tauri/target/release/bundle/` på runneren.

**Merk:** Windows-runneren må ha libvips DLL-ene tilgjengelig i repoet (i `src-tauri/installer/windows/vips/`) eller som en CI-step som laster dem ned før `tauri build`.
