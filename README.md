# Station

Station is a single node shared infrastructure runtime.

Core rules:
  - Convention over configuration.
  - Environment embedded everywhere. Clear separation and safety. Think about test and development sharing the same database.
  - Multiple apps, shared infrastructure. It is not a single app anymore.

## Deployment

Deploy an app.
```
STATION_ENV=development bin/station deploy
```
`STATION_ENV` is the environment name. If not specified, defaults to `development`.

Configure platform secrets in the vault (http://127.0.0.1:8200). Those will be mounted on tmpfs /run/secrets volumes of respective containers.

  - Postgres password: secret/platform/db/postgres_passwd
  - App platform secrets: secret/platform/app/...

Check:
  - App: http://127.0.0.1:8888
  - DB: 127.0.0.1:5432

## Naming conventions

Container: ```<project>-<application>-<environment>```

DB: ```<project>_<application>_<environment>```

Vault: ```<project>-<application>-<environment>```

## Sample station configuration file

Station configuration file station.yaml is placed in the root of the station project. An example is sample_project/station.yaml

## TODO

  - Propagate environment to database. Database definetely can be shared by different apps in the same environment. Follow Rails convention.
  - Share vault between multiple applications.
  - station create: initialize and bootstrap a new project
  - station create .: regenerate configurations from station.yaml
  - station deploy
  - station destroy
  - production: pull from the registry: https://oneuptime.com/blog/post/2026-02-08-how-to-use-docker-compose-with-pre-built-images-only/view
