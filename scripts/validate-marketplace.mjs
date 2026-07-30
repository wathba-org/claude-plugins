import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const claudeCatalog = await readJSON(".claude-plugin/marketplace.json");

assertString(claudeCatalog.name, "Claude marketplace name");
assertArray(claudeCatalog.plugins, "Claude marketplace plugins");

for (const entry of claudeCatalog.plugins) {
  assertString(entry.name, "plugin name");
  assertString(entry.source, `source for ${entry.name}`);
  if (!entry.source.startsWith("./plugins/")) {
    fail(`${entry.name} source must stay under ./plugins/`);
  }

  const pluginRoot = entry.source.slice(2);
  const claudeManifest = await readJSON(
    `${pluginRoot}/.claude-plugin/plugin.json`,
  );
  if (claudeManifest.name !== entry.name) {
    fail(`${entry.name} differs from its Claude manifest identity`);
  }

  if (entry.name === "wathba") {
    const productionPayload = await readTreeText([pluginRoot]);
    for (const marker of [
      "apidev.wathba.info",
      "platformdev.wathba.info",
      "wathba-dev",
      "wathba-development",
      "sk_live_",
      "sk_test_",
      "Bearer eyJ",
    ]) {
      if (productionPayload.includes(marker)) {
        fail(`production plugin contains forbidden marker ${marker}`);
      }
    }
  }

  const codexManifestPath = `${pluginRoot}/.codex-plugin/plugin.json`;
  if (!(await exists(codexManifestPath))) {
    continue;
  }

  const codexCatalog = await readJSON(".agents/plugins/marketplace.json");
  const codexEntry = codexCatalog.plugins?.find(
    (candidate) => candidate.name === entry.name,
  );
  if (!codexEntry) {
    fail(`${entry.name} has a Codex manifest but no Codex marketplace entry`);
  }
  if (codexEntry.source?.path !== entry.source) {
    fail(`${entry.name} uses different Claude and Codex source paths`);
  }

  const codexManifest = await readJSON(codexManifestPath);
  if (
    codexManifest.name !== entry.name ||
    codexManifest.mcpServers !== "./.mcp.json" ||
    codexManifest.skills !== "./skills/"
  ) {
    fail(`${entry.name} Codex manifest is not the dual-host package contract`);
  }

  const mcp = await readJSON(`${pluginRoot}/.mcp.json`);
  const servers = Object.entries(mcp.mcpServers ?? {});
  if (
    servers.length !== 1 ||
    servers[0][0] !== "wathba" ||
    servers[0][1]?.type !== "http" ||
    servers[0][1]?.url !== "https://api.wathba.info/mcp"
  ) {
    fail("production Wathba package must contain exactly the production MCP");
  }

  const release = await readJSON(`${pluginRoot}/release.json`);
  if (
    release.target !== "prod" ||
    release.pluginId !== "wathba" ||
    release.marketplaceId !== "wathba" ||
    release.apiOrigin !== "https://api.wathba.info" ||
    release.portalOrigin !== "https://platform.wathba.info" ||
    release.mcpEndpoint !== "https://api.wathba.info/mcp" ||
    release.credentialMode !== "oauth_pkce" ||
    JSON.stringify(release.requiredScopes) !== JSON.stringify(["mcp:read"]) ||
    release.sourceRepository !== "wathba-org/wathba-cli" ||
    !/^[0-9a-f]{40}$/u.test(release.sourceCommit ?? "")
  ) {
    fail("production Wathba release evidence is incomplete or mismatched");
  }

  const payload = await readTreeText([
    ".agents/plugins/marketplace.json",
    ".claude-plugin/marketplace.json",
    pluginRoot,
  ]);
  for (const marker of [
    "apidev.wathba.info",
    "platformdev.wathba.info",
    "wathba-dev",
    "wathba-development",
    "sk_live_",
    "sk_test_",
    "Bearer eyJ",
  ]) {
    if (payload.includes(marker)) {
      fail(`production marketplace contains forbidden marker ${marker}`);
    }
  }
}

console.log(
  `Validated ${claudeCatalog.plugins.length} marketplace plugin(s) without cross-environment leakage.`,
);

async function readJSON(relativePath) {
  let payload;
  try {
    payload = await readFile(resolve(root, relativePath), "utf8");
  } catch (error) {
    fail(`cannot read ${relativePath}: ${error.message}`);
  }
  try {
    return JSON.parse(payload);
  } catch (error) {
    fail(`invalid JSON in ${relativePath}: ${error.message}`);
  }
}

async function exists(relativePath) {
  try {
    await stat(resolve(root, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function readTreeText(relativePaths) {
  const { readdir } = await import("node:fs/promises");
  const chunks = [];
  for (const relativePath of relativePaths) {
    const absolute = resolve(root, relativePath);
    const info = await stat(absolute);
    if (info.isFile()) {
      chunks.push(await readFile(absolute, "utf8"));
      continue;
    }
    for (const entry of await readdir(absolute, {
      recursive: true,
      withFileTypes: true,
    })) {
      if (entry.isFile()) {
        chunks.push(await readFile(resolve(entry.parentPath, entry.name), "utf8"));
      }
    }
  }
  return chunks.join("\n");
}

function assertString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    fail(`${label} must be a non-empty string`);
  }
}

function assertArray(value, label) {
  if (!Array.isArray(value) || value.length === 0) {
    fail(`${label} must be a non-empty array`);
  }
}

function fail(message) {
  throw new Error(message);
}
