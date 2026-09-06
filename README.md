# Station

## Local deployment

Deploy local station:
```
tool/deploy_local google-sheet-demo
```

Configure secrets in the vault (http://127.0.0.1:8200):

  - Postgres password: db/postgres_passwd
  - App secrets: app/...

Check:
  - App: http://127.0.0.1:8888
  - DB: 127.0.0.1:5432
