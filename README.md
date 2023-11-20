# Trøkk
App for minimumsregistrering og filfytting av objekter fra skannemaskiner.

## Setup

For oppstart:
```bash
    npm install
    npm run tauri dev
```

Er nå hardkodet til å hente filer fra ```$DOCUMENT/trokk/files```, så lag en mappe der med noen filer.


### Krevde environment variabler

Sett disse environment variablene for å få appen til å fungere:

| Variabel    | Beskrivelse                                  |
|-------------|----------------------------------------------|
| `PAPI_PATH` | URL til API'et vi sender registreringen til. |