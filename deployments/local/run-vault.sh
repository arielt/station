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
fi

wait "$pid"
