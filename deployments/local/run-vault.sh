#!/bin/sh
set -eu

export VAULT_ADDR="${VAULT_ADDR:-http://127.0.0.1:8200}"

DATA_DIR=/openbao/file
UNSEAL_KEY_FILE="${DATA_DIR}/unseal-key"
INIT_ROOT_TOKEN_FILE="${DATA_DIR}/init-root-token"
ROOT_TOKEN_ID="${VAULT_DEV_ROOT_TOKEN_ID:-root}"

mkdir -p "${DATA_DIR}/data"
chown -R openbao:openbao "${DATA_DIR}"

su-exec openbao bao server -config=/openbao/config/vault.hcl &
pid=$!
trap 'kill -TERM "$pid" 2>/dev/null || true; wait "$pid"' INT TERM

while true; do
  rc=0
  bao status >/dev/null 2>&1 || rc=$?
  if [ "$rc" = "0" ] || [ "$rc" = "2" ]; then
    break
  fi
  sleep 0.25
done

status_json=$(bao status -format=json 2>/dev/null || true)

if ! echo "$status_json" | grep -q '"initialized"[[:space:]]*:[[:space:]]*true'; then
  init_out=$(bao operator init -key-shares=1 -key-threshold=1 -format=json)
  compact=$(printf '%s' "$init_out" | tr -d '\n')
  printf '%s' "$compact" | sed -n 's/.*"unseal_keys_b64"[[:space:]]*:[[:space:]]*\[[[:space:]]*"\([^"]*\)".*/\1/p' > "$UNSEAL_KEY_FILE"
  printf '%s' "$compact" | sed -n 's/.*"root_token"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' > "$INIT_ROOT_TOKEN_FILE"
  chmod 600 "$UNSEAL_KEY_FILE" "$INIT_ROOT_TOKEN_FILE"
  chown openbao:openbao "$UNSEAL_KEY_FILE" "$INIT_ROOT_TOKEN_FILE"
  if [ ! -s "$UNSEAL_KEY_FILE" ] || [ ! -s "$INIT_ROOT_TOKEN_FILE" ]; then
    echo "failed to parse operator init output" >&2
    echo "$init_out" >&2
    exit 1
  fi
fi

if [ -f "$UNSEAL_KEY_FILE" ]; then
  bao operator unseal "$(cat "$UNSEAL_KEY_FILE")" >/dev/null
fi

if [ -f "$INIT_ROOT_TOKEN_FILE" ]; then
  token=$(cat "$INIT_ROOT_TOKEN_FILE")
  if ! VAULT_TOKEN="$token" bao secrets list -format=json 2>/dev/null | grep -q '"secret/"'; then
    VAULT_TOKEN="$token" bao secrets enable -path=secret kv-v2
  fi
  if ! VAULT_TOKEN="$token" bao token lookup "$ROOT_TOKEN_ID" >/dev/null 2>&1; then
    VAULT_TOKEN="$token" bao token create -id="$ROOT_TOKEN_ID" -policy=root -orphan >/dev/null
  fi

  if ! VAULT_TOKEN="$token" bao auth list -format=json 2>/dev/null | grep -q '"approle/"'; then
    VAULT_TOKEN="$token" bao auth enable approle
  fi
  if ! VAULT_TOKEN="$token" bao read auth/approle/role/app >/dev/null 2>&1; then
    VAULT_TOKEN="$token" bao write auth/approle/role/app \
      token_ttl=1h \
      token_max_ttl=24h \
      token_num_uses=0 \
      secret_id_ttl=0 \
      secret_id_num_uses=0 \
      token_policies=default
  fi

  role_id=$(VAULT_TOKEN="$token" bao read -field=role_id auth/approle/role/app/role-id)
  secret_id_file="${DATA_DIR}/app-approle-secret-id"
  if [ ! -s "$secret_id_file" ]; then
    VAULT_TOKEN="$token" bao write -f -field=secret_id auth/approle/role/app/secret-id > "$secret_id_file"
    chmod 600 "$secret_id_file"
    chown openbao:openbao "$secret_id_file"
  fi
  secret_id=$(cat "$secret_id_file")

  if VAULT_TOKEN="$token" bao kv get secret/platform/app >/dev/null 2>&1; then
    VAULT_TOKEN="$token" bao kv patch secret/platform/app \
      approle_role_id="$role_id" \
      approle_secret_id="$secret_id"
  else
    VAULT_TOKEN="$token" bao kv put secret/platform/app \
      approle_role_id="$role_id" \
      approle_secret_id="$secret_id"
  fi
fi

wait "$pid"
