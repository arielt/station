#!/bin/sh
set -eu

printf '%s' "${VAULT_DEV_ROOT_TOKEN_ID}" > /tmp/vault-token
chmod 600 /tmp/vault-token

exec /usr/local/bin/docker-entrypoint.sh agent -config=/openbao/config/agent.hcl
