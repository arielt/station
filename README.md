# Station

Station is a web application runtime with shared infrastructure.

## Deployment

Deploy an app. `STATION_APP` is the path to the app root, relative to the repo root:
```
STATION_APP=apps/google-sheet-demo tools/deploy
```

Configure platform secrets in the vault (http://127.0.0.1:8200). Those will be mounted on tmpfs /run/secrets volumes of respective containers.

  - Postgres password: secret/platform/db/postgres_passwd
  - App platform secrets: secret/platform/app/...

Check:
  - App: http://127.0.0.1:8888
  - DB: 127.0.0.1:5432

## TODO

  - Enforce STATION_ENV
