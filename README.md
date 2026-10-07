# Station

Station is a web application runtime with shared infrastructure.

## Deployment

Deploy an app from apps folder:
```
tools/deploy google-sheet-demo
```

Configure platform secrets in the vault (http://127.0.0.1:8200). Those will be mounted on tmpfs /run/secrets volumes of respective containers.

  - Postgres password: secret/platform/db/postgres_passwd
  - App platform secrets: secret/platform/app/...

Check:
  - App: http://127.0.0.1:8888
  - DB: 127.0.0.1:5432


## TODO
  - Let docker manage volumes
  - Add support for STATION_ENV: development, production, test
  - Add support for STATION_APP: path to application folder
  - tools: apply in container
