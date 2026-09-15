# Login

Sample login application. Supports Google, GitHub and email login.


## Vault

Vault: add to secret/platform/app:
  - postgres_passwd

## Google

Add project to https://console.cloud.google.com/auth/clients:
  - Javascript origins: http://127.0.0.1:8888
  - Redirect URIs:
    - http://127.0.0.1:8888/auth/google/callback
    - http://127.0.0.1:8888/auth/github/callback

Vault: add to secret/platform/app:
  - google_client_id
  - google_client_secret

## GitHub

Vault: add to secret/platform/app:
  - github_client_id
  - github_client_secret

## Email


## TODO

  - The app should connect to a database app_environment, e.g. login_development
