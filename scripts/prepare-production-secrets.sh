#!/usr/bin/env bash
# ==============================================================================
# WATeamInbox - Prepare Production Secrets for Docker Compose
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SECRETS_DIR="$ROOT_DIR/secrets"

echo "[*] Setting up secrets directory at $SECRETS_DIR..."
mkdir -p "$SECRETS_DIR"
chmod 700 "$SECRETS_DIR"

declare -a SECRETS=(
  "postgres_password"
  "worker_postgres_password"
  "nats_service_password"
  "nats_worker_password"
  "jwt_secret"
  "centrifugo_api_key"
  "centrifugo_token_secret"
)

for name in "${SECRETS[@]}"; do
  file="$SECRETS_DIR/$name"
  if [ -s "$file" ]; then
    echo "  [=] $name already exists, keeping existing value"
  else
    echo "  [+] Generating random 256-bit hex secret for $name..."
    openssl rand -hex 32 > "$file"
    chmod 600 "$file"
  fi
done

# Resend API Key placeholder if not present
if [ ! -s "$SECRETS_DIR/resend_api_key" ]; then
  echo "  [!] Note: To enable email delivery via Resend, put your API key in: secrets/resend_api_key"
  touch "$SECRETS_DIR/resend_api_key"
  chmod 600 "$SECRETS_DIR/resend_api_key"
fi

echo "[+] All production secrets initialized with mode 0600."

