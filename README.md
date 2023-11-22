# Trøkk

App for minimumsregistrering og filfytting av objekter fra skannemaskiner.
Laget i Tauri med Rust og Svelte.

**NB:** Appen er en prototype som enda er i utvikling. Store endringer vil kunne forekomme.


## Setup
Rust må være installert på maskinen. Se [rust-lang.org](https://www.rust-lang.org/tools/install).

For installasjon av nødvendige pakker og oppstart:

```bash
    npm install
    npm run tauri dev
```

Appen er nå hardkodet til å hente filer fra ```$DOCUMENT/trokk/files```, så lag en mappe der med noen filer.


### Krevde environment variabler

Sett disse environment variablene for å få appen til å fungere:

| Variabel             | Beskrivelse                                                |
|----------------------|------------------------------------------------------------|
| `PAPI_PATH`          | URL til API'et vi sender registreringen til.               |
| `OIDC_BASE_URL`      | URL til OIDC server (inkludert "protocol/openid-connect"). |
| `OIDC_CLIENT_ID`     | Client ID til OIDC server.                                 |
| `OIDC_CLIENT_SECRET` | Client secret til OIDC server.                             |



## Vedlikehold

Tekst-teamet på Nasjonalbibliotekets IT-avdeling vedlikeholder **Trøkk**.

Alle kan lage issues, men vi kan ikke garantere at alle blir tatt tak i. Interne behov går foran eksterne forespørsler.
