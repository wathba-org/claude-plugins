#!/usr/bin/env bash
# Checks the live OAuth metadata and health of one target's MCP endpoint.
#
#   scripts/check-oauth.sh <dev|prod>
set -euo pipefail

target="$1"
config="$(dirname "$0")/../plugin.config.json"
api="$(jq -r --arg t "$target" '.targets[$t].apiOrigin' "$config")"
portal="$(jq -r --arg t "$target" '.targets[$t].portalOrigin' "$config")"

fetch() {
  curl --fail --silent --show-error --retry 3 --retry-all-errors --max-time 20 "$1"
}

resource="$(fetch "$api/.well-known/oauth-protected-resource/mcp")"
authorization="$(fetch "$api/.well-known/oauth-authorization-server")"
fetch "$api/healthz" >/dev/null

jq -e --arg api "$api" --arg portal "$portal" '
  .resource == ($api + "/mcp") and
  .authorization_servers == [$api] and
  (.scopes_supported | index("mcp:read") != null) and
  .resource_documentation == ($portal + "/docs/mcp")
' <<<"$resource" >/dev/null || { echo "$resource"; echo "protected-resource metadata drifted" >&2; exit 1; }

jq -e --arg api "$api" --arg portal "$portal" '
  .issuer == $api and
  .authorization_endpoint == ($portal + "/oauth/authorize") and
  .token_endpoint == ($api + "/v1/oauth/token") and
  .registration_endpoint == ($api + "/v1/oauth/register") and
  (.scopes_supported | index("mcp:read") != null) and
  (.code_challenge_methods_supported | index("S256") != null)
' <<<"$authorization" >/dev/null || { echo "$authorization"; echo "authorization-server metadata drifted" >&2; exit 1; }

echo "oauth: $target metadata at $api matches the plugin"
