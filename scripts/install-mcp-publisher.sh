#!/usr/bin/env bash
# Installs the pinned MCP Registry publisher (linux/amd64) after checking its
# release checksum.
#
#   scripts/install-mcp-publisher.sh <dest-dir>
set -euo pipefail

version="1.8.1"
sha256="a06c9096dcb9727c13555b6be26c7effa707b01f06a4c561ba7a3635443cf2cc"
dest="$1"

mkdir -p "$dest"
curl --fail --silent --show-error --location --retry 3 \
  -o "$dest/mcp-publisher.tgz" \
  "https://github.com/modelcontextprotocol/registry/releases/download/v${version}/mcp-publisher_linux_amd64.tar.gz"
echo "${sha256}  $dest/mcp-publisher.tgz" | sha256sum --check --quiet -
tar -xzf "$dest/mcp-publisher.tgz" -C "$dest" mcp-publisher
rm "$dest/mcp-publisher.tgz"
echo "mcp-publisher ${version} installed in $dest"
