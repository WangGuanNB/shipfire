#!/usr/bin/env bash
# Sync sensitive keys from .env.local to Cloudflare Workers secrets.
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env.local ]]; then
  echo "Missing .env.local" >&2
  exit 1
fi

get_env() {
  local key="$1"
  local line val
  line=$(grep -E "^${key}=" .env.local | head -1 || true)
  [[ -z "$line" ]] && return 1
  val="${line#*=}"
  val="${val#"${val%%[![:space:]]*}"}"
  val="${val%"${val##*[![:space:]]}"}"
  val="${val%\"}"
  val="${val#\"}"
  val="${val%\'}"
  val="${val#\'}"
  [[ -z "$val" || "$val" == "sk_test_..." || "$val" == "pk_test_..." || "$val" == "whsec_..." ]] && return 1
  printf '%s' "$val"
}

put_secret() {
  local key="$1"
  local val
  val=$(get_env "$key") || return 0
  echo "→ $key"
  printf '%s' "$val" | pnpm exec wrangler secret put "$key"
}

export CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN:-$(get_env CLOUDFLARE_D1_TOKEN || true)}"
if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "Set CLOUDFLARE_API_TOKEN or CLOUDFLARE_D1_TOKEN in .env.local" >&2
  exit 1
fi

SECRETS=(
  KIE_API_KEY
  FAL_KEY
  REPLICATE_API_TOKEN
  R2_ACCESS_KEY_ID
  R2_SECRET_ACCESS_KEY
  AUTH_SECRET
  AUTH_GOOGLE_SECRET
  RESEND_API_KEY
  CREEM_API_KEY
  CREEM_WEBHOOK_SECRET
  AI_MAINTENANCE_SECRET
  PAYPAL_CLIENT_ID
  PAYPAL_CLIENT_SECRET
  DEEPSEEK_API_KEY
  REVALIDATE_SECRET
)

for key in "${SECRETS[@]}"; do
  put_secret "$key"
done

echo "Done."
