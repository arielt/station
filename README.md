# Station

Station is a web application runtime with shared infrastructure.

## Deployment

Deploy an app. `STATION_ENV` is the environment name. `STATION_APP` is the path to the app root, relative to the repo root:
```
STATION_ENV=development STATION_APP=apps/google-sheet-demo tools/deploy
```

Configure platform secrets in the vault (http://127.0.0.1:8200). Those will be mounted on tmpfs /run/secrets volumes of respective containers.

  - Postgres password: secret/platform/db/postgres_passwd
  - App platform secrets: secret/platform/app/...

Check:
  - App: http://127.0.0.1:8888
  - DB: 127.0.0.1:5432

## TODO

  - Propagate environment to database. Database definetely can be shared by different apps in the same environment.
