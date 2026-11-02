#!/bin/sh
set -eu

printf '%s' "${VAULT_DEV_ROOT_TOKEN_ID}" > /tmp/vault-token
chmod 600 /tmp/vault-token

# writeToFile opens the destination for rewrite; 0444 files from earlier
# renders cause "permission denied" on the next template cycle.
mkdir -p /run/secrets /run/db-secrets
chmod u+w /run/secrets/* /run/db-secrets/* 2>/dev/null || true

exec /usr/local/bin/docker-entrypoint.sh agent -config=/openbao/config/agent.hcl
