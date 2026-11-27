# Station

Station is a single node shared infrastructure runtime.

Core rules:
  - Convention over configuration.
  - Environment embedded everywhere. Clear separation and safety. Think about test and development sharing the same database.
  - Multiple apps, shared infrastructure. It is not a single app anymore.

## Project

To create a Station project, run `station create new_project`. Same command to regenerate existing project.


## Deployment

To deploy a project, run in the project's root folder:
```
STATION_ENV=development station deploy
```
`STATION_ENV` is the environment name. If not specified, defaults to `development`.

List endpoints:
```
STATION_ENV=development station endpoints
STATION_ENV=development
connector          http      http://127.0.0.1:8888
google_sheet_demo  http      http://127.0.0.1:8889
login              http      http://127.0.0.1:8890
vault              http      http://127.0.0.1:8200
db                 postgres  postgres://127.0.0.1:5432
```

Configure platform secrets in the vault, using vault endpoint.
  - Platform secrets, including the Postgres password field `postgres_passwd`: `secret/<project>-platform-<environment>`
  - Application secrets: `secret/<project>-<application>-<environment>`

Check application endpoints.

## Clenup

To remove all project containers, volumes and unused images, run in the project root:
```
station destroy
```

## Sample station configuration file

Station configuration file station.yaml is placed in the root of the station project. An example is sample_project/station.yaml

## TODO

  - production: pull from the registry: https://oneuptime.com/blog/post/2026-02-08-how-to-use-docker-compose-with-pre-built-images-only/view
