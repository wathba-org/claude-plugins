#!/usr/bin/env node
// Builds the Wathba agent plugin marketplaces from plugin.config.json and src/,
// and enforces the packaging rules. No dependencies; Node 24.
//
//   node scripts/sync.mjs build --target dev|prod --out <dir> [--version <v>]
//   node scripts/sync.mjs check
//   node scripts/sync.mjs digest --target dev|prod
//   node scripts/sync.mjs version-rule --base <git-ref>
//
// `build` writes one complete marketplace tree. Writing into the repository
// root replaces only the generated paths. `check` builds both targets in
// memory, validates them, and (once config.rootTarget is set) requires the
// committed root output to equal a fresh build.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const AGENT_PLUGIN_SCHEMA =
  "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json";
const AGENT_MCP_SCHEMA =
  "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json";
const REGISTRY_SCHEMA =
  "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json";
const SKILL_NAME = "wathba";
const NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SEMVER_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
const SECRET_MARKERS = [
  "sk_live_",
  "sk_test_",
  "wtb_",
  "whsec_",
  "Bearer ",
  '"authorization"',
  '"Authorization"',
];
// Paths the generator owns when it writes a marketplace tree.
const MARKETPLACE_FILES = [
  ".claude-plugin/marketplace.json",
  ".agents/plugins/marketplace.json",
  "contract.json",
];

class RuleError extends Error {}

function fail(rule, message) {
  throw new RuleError(`[${rule}] ${message}`);
}

function json(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}

async function loadConfig() {
  const config = JSON.parse(
    await readFile(join(ROOT, "plugin.config.json"), "utf8"),
  );
  if (!SEMVER_PATTERN.test(config.version ?? "") || config.version.includes("-"))
    fail("config", "version must be a release semver such as 2.0.0");
  for (const name of ["prod", "dev"]) {
    const target = config.targets?.[name];
    if (!target) fail("config", `missing target ${name}`);
    for (const key of ["marketplace", "plugin", "serverKey"])
      if (!NAME_PATTERN.test(target[key] ?? ""))
        fail("config", `${name}.${key} must be kebab-case`);
    for (const key of ["apiOrigin", "portalOrigin"])
      if (!/^https:\/\/[a-z0-9.-]+$/.test(target[key] ?? ""))
        fail("config", `${name}.${key} must be a bare https origin`);
  }
  if (config.codex.defaultPrompt.length > 3)
    fail("config", "Codex allows at most 3 default prompts");
  for (const prompt of config.codex.defaultPrompt)
    if (prompt.length > 128)
      fail("config", `default prompt over 128 characters: ${prompt}`);
  if (config.registryDescription.length > 100)
    fail("config", "registryDescription must be at most 100 characters");
  if (config.shortDescription.length > 30)
    fail("config", "shortDescription must be at most 30 characters (OpenAI listing subtitle)");
  // The production package is committed at the root; check and version-rule
  // must always compare against it, so the field cannot be dropped.
  if (config.rootTarget !== "prod")
    fail("config", 'rootTarget must be "prod"');
  return config;
}

async function loadSources(config) {
  const icons = {};
  for (const theme of ["light", "dark"]) {
    const { source, sha256: expected } = config.branding.icons[theme];
    const bytes = await readFile(join(ROOT, source));
    if (sha256(bytes) !== expected)
      fail("icon", `${source} does not match branding.icons.${theme}.sha256`);
    checkListingImage(source, bytes);
    icons[theme] = bytes;
  }
  const skill = await readFile(join(ROOT, config.skill.source), "utf8");
  const devReadme = await readFile(join(ROOT, "src/dev-branch-README.md"), "utf8");
  const license = await readFile(join(ROOT, "LICENSE"), "utf8");
  return { icons, skill, devReadme, license };
}

// Listing images must be square PNGs, 48 to 4096 pixels, at most 5 MiB
// (OpenAI plugin submission requirements; hosts accept the same files).
function checkListingImage(path, bytes) {
  const signature = "89504e470d0a1a0a";
  if (bytes.subarray(0, 8).toString("hex") !== signature || bytes.toString("ascii", 12, 16) !== "IHDR")
    fail("icon", `${path} must be a PNG`);
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (width !== height) fail("icon", `${path} must be square (is ${width}x${height})`);
  if (width < 48 || width > 4096)
    fail("icon", `${path} must be 48 to 4096 pixels wide (is ${width})`);
  if (bytes.length > 5 * 1024 * 1024) fail("icon", `${path} must be at most 5 MiB`);
}

function pluginReadme(config, target, mcpUrl, docsUrl, targetName) {
  const ref = targetName === "prod" ? "" : `#${target.branch}`;
  const codexRef = targetName === "prod" ? "" : ` --ref ${target.branch}`;
  const id = `${target.plugin}@${target.marketplace}`;
  const environment =
    targetName === "prod" ? "Wathba" : "the Wathba development environment";
  return `# ${target.displayName}

Connects Codex, Claude Code and other Agent Plugins clients to ${environment}
over MCP. The member signs in through the browser (OAuth); no API key or token
ever goes through the chat.

- MCP server: ${mcpUrl}
- Guide: ${docsUrl}

## Claude Code

\`\`\`text
/plugin marketplace add wathba-org/wathba-plugin${ref}
/plugin install ${id}
\`\`\`

Run \`/mcp\`, choose \`${target.serverKey}\` and sign in. To receive updates
automatically, open \`/plugin\`, go to Marketplaces, select
\`${target.marketplace}\` and choose Enable auto-update.

## Codex and the ChatGPT desktop app

\`\`\`sh
codex plugin marketplace add wathba-org/wathba-plugin${codexRef}
codex plugin add ${id}
\`\`\`

Installing from the app's Plugins page starts sign-in. In a terminal, run
\`codex mcp login ${target.serverKey}\`. Codex checks the marketplace for
updates when it starts.

## One connection

Use either this plugin or a direct MCP connection to ${mcpUrl}, not both,
or every Wathba tool appears twice.
`;
}

// Returns Map<relativePath, Buffer|string> for one marketplace tree.
function buildFiles(config, sources, targetName, version) {
  const target = config.targets[targetName];
  const pluginDir = `plugins/${target.plugin}`;
  const mcpUrl = `${target.apiOrigin}/mcp`;
  const docsUrl = `${target.portalOrigin}/docs/mcp`;
  const author = {
    name: config.publisher.name,
    email: config.publisher.email,
    url: config.publisher.url,
  };
  const description =
    targetName === "prod"
      ? config.description
      : config.description.replace(
          "Connect your coding agent to Wathba",
          "Connect your coding agent to the Wathba development environment",
        );
  const files = new Map();

  files.set(
    ".claude-plugin/marketplace.json",
    json({
      name: target.marketplace,
      owner: author,
      metadata: {
        description: `Official ${target.marketplaceDisplayName} plugin marketplace`,
      },
      plugins: [
        {
          name: target.plugin,
          source: `./${pluginDir}`,
          description,
          category: config.claude.category,
          keywords: config.keywords,
        },
      ],
    }),
  );
  files.set(
    ".agents/plugins/marketplace.json",
    json({
      name: target.marketplace,
      interface: { displayName: target.marketplaceDisplayName },
      plugins: [
        {
          name: target.plugin,
          source: { source: "local", path: `./${pluginDir}` },
          policy: {
            installation: config.codex.installation,
            authentication: config.codex.authentication,
          },
          category: config.codex.category,
        },
      ],
    }),
  );
  files.set(
    "contract.json",
    json({
      schemaVersion: "wathba.agent-plugin-contract.v1",
      target: targetName,
      marketplace: target.marketplace,
      plugin: target.plugin,
      serverKey: target.serverKey,
      mcpEndpoint: mcpUrl,
      tools: [...config.skill.tools].sort(),
    }),
  );
  if (targetName === "dev") {
    // The dev branch is a whole marketplace on its own.
    files.set("README.md", sources.devReadme);
    files.set("LICENSE", sources.license);
  }
  if (targetName === "prod") {
    files.set(
      "server.json",
      json({
        $schema: REGISTRY_SCHEMA,
        name: config.registry.name,
        title: config.registry.title,
        description: config.registryDescription,
        version,
        websiteUrl: docsUrl,
        repository: { url: config.repository, source: "github" },
        remotes: [{ type: "streamable-http", url: mcpUrl }],
      }),
    );
  }

  files.set(
    `${pluginDir}/plugin.json`,
    json({
      $schema: AGENT_PLUGIN_SCHEMA,
      name: target.plugin,
      version,
      description,
      author,
      homepage: docsUrl,
      repository: config.repository,
      license: config.license,
      keywords: config.keywords,
      extensions: {
        "com.openai": {
          interface: {
            displayName: target.displayName,
            shortDescription: config.shortDescription,
            longDescription: description,
            developerName: config.publisher.name,
            category: config.codex.category,
            capabilities: config.codex.capabilities,
            websiteURL: docsUrl,
            privacyPolicyURL: config.publisher.privacyPolicyURL,
            // Omitted from the JSON until the config sets it.
            termsOfServiceURL: config.publisher.termsOfServiceURL,
            brandColor: config.branding.brandColor,
            composerIcon: "./assets/wathba-icon-light.png",
            composerIconDark: "./assets/wathba-icon-dark.png",
            logo: "./assets/wathba-icon-light.png",
            logoDark: "./assets/wathba-icon-dark.png",
            defaultPrompt: config.codex.defaultPrompt,
          },
        },
      },
    }),
  );
  files.set(
    `${pluginDir}/mcp.json`,
    json({
      $schema: AGENT_MCP_SCHEMA,
      mcpServers: {
        [target.serverKey]: { type: "streamable-http", url: mcpUrl },
      },
    }),
  );
  files.set(
    `${pluginDir}/.claude-plugin/plugin.json`,
    json({
      name: target.plugin,
      displayName: target.displayName,
      version,
      description,
      author,
      homepage: docsUrl,
      repository: config.repository,
      license: config.license,
      keywords: config.keywords,
    }),
  );
  files.set(
    `${pluginDir}/.mcp.json`,
    json({
      mcpServers: { [target.serverKey]: { type: "http", url: mcpUrl } },
    }),
  );
  files.set(`${pluginDir}/skills/${SKILL_NAME}/SKILL.md`, sources.skill);
  files.set(`${pluginDir}/assets/wathba-icon-light.png`, sources.icons.light);
  files.set(`${pluginDir}/assets/wathba-icon-dark.png`, sources.icons.dark);
  files.set(
    `${pluginDir}/README.md`,
    pluginReadme(config, target, mcpUrl, docsUrl, targetName),
  );
  return files;
}

// Digest of the tree with the version normalized, so two builds that differ
// only in version share one digest (used to skip no-op DEV publishes).
function contentDigest(config, sources, targetName) {
  const files = buildFiles(config, sources, targetName, "0.0.0");
  const hash = createHash("sha256");
  for (const path of [...files.keys()].sort()) {
    hash.update(`${path}\0`);
    hash.update(files.get(path));
    hash.update("\0");
  }
  return `sha256:${hash.digest("hex")}`;
}

function build(config, sources, targetName, version) {
  const target = config.targets[targetName];
  const files = buildFiles(config, sources, targetName, version);
  files.set(
    `plugins/${target.plugin}/release.json`,
    json({
      schemaVersion: "wathba.agent-plugin-release.v2",
      target: targetName,
      marketplace: target.marketplace,
      plugin: target.plugin,
      version,
      mcpEndpoint: `${target.apiOrigin}/mcp`,
      portalOrigin: target.portalOrigin,
      credentialMode: "oauth_pkce",
      contentDigest: contentDigest(config, sources, targetName),
    }),
  );
  validate(config, targetName, files, version);
  return files;
}

function text(files, path) {
  const value = files.get(path);
  if (value === undefined) fail("files", `missing ${path}`);
  return Buffer.isBuffer(value) ? value.toString("utf8") : value;
}

function parse(files, path) {
  try {
    return JSON.parse(text(files, path));
  } catch (error) {
    if (error instanceof RuleError) throw error;
    fail("json", `${path} is not valid JSON: ${error.message}`);
  }
}

function exactKeys(object, allowed, where) {
  for (const key of Object.keys(object))
    if (!allowed.includes(key)) fail("schema", `${where} has unexpected key ${key}`);
}

function validate(config, targetName, files, version) {
  const target = config.targets[targetName];
  const other = config.targets[targetName === "prod" ? "dev" : "prod"];
  const pluginDir = `plugins/${target.plugin}`;
  const mcpUrl = `${target.apiOrigin}/mcp`;

  if (!SEMVER_PATTERN.test(version)) fail("version", `not semver: ${version}`);

  // Catalogs.
  const claudeCatalog = parse(files, ".claude-plugin/marketplace.json");
  if (claudeCatalog.name !== target.marketplace)
    fail("identity", "Claude marketplace name differs from target");
  if (claudeCatalog.plugins?.length !== 1)
    fail("identity", "Claude marketplace must list exactly one plugin");
  const claudeEntry = claudeCatalog.plugins[0];
  if (claudeEntry.name !== target.plugin || claudeEntry.source !== `./${pluginDir}`)
    fail("identity", "Claude marketplace entry name or source differs");
  if ("version" in claudeEntry)
    fail("version", "the Claude marketplace entry must not repeat the version");

  const codexCatalog = parse(files, ".agents/plugins/marketplace.json");
  if (codexCatalog.name !== target.marketplace || codexCatalog.plugins?.length !== 1)
    fail("identity", "Codex marketplace name or plugin count differs");
  const codexEntry = codexCatalog.plugins[0];
  if (
    codexEntry.name !== target.plugin ||
    codexEntry.source?.source !== "local" ||
    codexEntry.source?.path !== `./${pluginDir}`
  )
    fail("identity", "Codex marketplace entry name or source differs");
  if (!["AVAILABLE", "INSTALLED_BY_DEFAULT", "NOT_AVAILABLE"].includes(codexEntry.policy?.installation))
    fail("schema", "Codex policy.installation is invalid");
  if (!["ON_INSTALL", "ON_USE"].includes(codexEntry.policy?.authentication))
    fail("schema", "Codex policy.authentication is invalid");

  // Portable manifest (Codex and Agent Plugins clients).
  const portable = parse(files, `${pluginDir}/plugin.json`);
  if (portable.$schema !== AGENT_PLUGIN_SCHEMA)
    fail("schema", "plugin.json must declare the Agent Plugins 1.0.0 schema");
  exactKeys(
    portable,
    ["$schema", "name", "version", "description", "author", "homepage", "repository", "license", "keywords", "extensions"],
    "plugin.json",
  );
  if (portable.name !== target.plugin) fail("identity", "plugin.json name differs");
  if (portable.version !== version) fail("version", "plugin.json version differs");
  const openai = portable.extensions?.["com.openai"]?.interface;
  if (!openai) fail("schema", "plugin.json lacks extensions.com.openai.interface");
  if (openai.displayName !== target.displayName)
    fail("identity", "Codex displayName differs from target");
  if ((openai.defaultPrompt ?? []).length > 3)
    fail("schema", "Codex allows at most 3 default prompts");
  for (const key of ["composerIcon", "composerIconDark", "logo", "logoDark"]) {
    const path = openai[key];
    if (!path?.startsWith("./") || !files.has(`${pluginDir}/${path.slice(2)}`))
      fail("paths", `Codex ${key} must be a ./ path inside the plugin`);
  }

  // Claude manifest.
  const claudeManifest = parse(files, `${pluginDir}/.claude-plugin/plugin.json`);
  if (claudeManifest.name !== target.plugin)
    fail("identity", "Claude plugin.json name differs");
  if (claudeManifest.version !== version)
    fail("version", "Claude plugin.json version differs");

  // MCP configs: one server, the target URL, nothing else.
  const portableMcp = parse(files, `${pluginDir}/mcp.json`);
  exactKeys(portableMcp, ["$schema", "mcpServers"], "mcp.json");
  if (portableMcp.$schema !== AGENT_MCP_SCHEMA)
    fail("schema", "mcp.json must declare the Agent Plugins MCP schema");
  const claudeMcp = parse(files, `${pluginDir}/.mcp.json`);
  exactKeys(claudeMcp, ["mcpServers"], ".mcp.json");
  for (const [path, config_, type] of [
    ["mcp.json", portableMcp, "streamable-http"],
    [".mcp.json", claudeMcp, "http"],
  ]) {
    const servers = Object.entries(config_.mcpServers ?? {});
    if (servers.length !== 1 || servers[0][0] !== target.serverKey)
      fail("mcp", `${path} must hold exactly the ${target.serverKey} server`);
    exactKeys(servers[0][1], ["type", "url"], `${path} server`);
    if (servers[0][1].type !== type || servers[0][1].url !== mcpUrl)
      fail("mcp", `${path} must point ${type} at ${mcpUrl}`);
  }

  // Skill.
  const skill = text(files, `${pluginDir}/skills/${SKILL_NAME}/SKILL.md`);
  const frontmatter = /^---\n([\s\S]*?)\n---\n/.exec(skill);
  if (!frontmatter) fail("skill", "SKILL.md lacks YAML frontmatter");
  const nameLine = /^name:\s*(.+)$/m.exec(frontmatter[1]);
  if (nameLine?.[1].trim() !== SKILL_NAME)
    fail("skill", `skill name must be ${SKILL_NAME} to match its folder`);
  const descriptionLine = /^description:\s*"?(.+?)"?\s*$/m.exec(frontmatter[1]);
  if (!descriptionLine || descriptionLine[1].length > 1024)
    fail("skill", "skill description is missing or over 1024 characters");
  const declared = new Set(config.skill.tools);
  const allowed = new Set([...declared, ...config.skill.nonToolTerms]);
  for (const [, token] of skill.matchAll(/`([a-z][a-z0-9]*(?:_[a-z0-9]+)+)`/g))
    if (!allowed.has(token))
      fail("skill", `\`${token}\` is not a declared tool in plugin.config.json`);
  for (const tool of declared)
    if (!skill.includes(`\`${tool}\``))
      fail("skill", `declared tool ${tool} does not appear in SKILL.md`);
  if (/\bwathba (login|skill|mcp|install|integrate)\b/i.test(skill) || /npm install/i.test(skill))
    fail("skill", "the shared skill must not depend on the Wathba CLI");

  // Contract and icon.
  const contract = parse(files, "contract.json");
  if (contract.mcpEndpoint !== mcpUrl || contract.plugin !== target.plugin)
    fail("contract", "contract.json identity differs");
  for (const theme of ["light", "dark"]) {
    const icon = files.get(`${pluginDir}/assets/wathba-icon-${theme}.png`);
    if (!Buffer.isBuffer(icon) || sha256(icon) !== config.branding.icons[theme].sha256)
      fail("icon", `packaged ${theme} icon does not match branding.icons.${theme}.sha256`);
  }

  // Registry entry (production only).
  if (targetName === "prod") {
    const server = parse(files, "server.json");
    if (server.version !== version || server.remotes?.[0]?.url !== mcpUrl)
      fail("registry", "server.json version or remote URL differs");
  } else if (files.has("server.json")) {
    fail("registry", "only the production build publishes server.json");
  }

  // Environment isolation and secrets, across every text file.
  const otherMarkers = [
    other.apiOrigin,
    other.portalOrigin,
    `${other.plugin}@${other.marketplace}`,
  ];
  // Quoted identities, except ones that are also shared keywords ("wathba").
  for (const name of [other.marketplace, other.plugin, other.serverKey])
    if (!config.keywords.includes(name)) otherMarkers.push(`"${name}"`);
  for (const [path, value] of files) {
    if (Buffer.isBuffer(value)) continue;
    for (const marker of otherMarkers)
      if (value.includes(marker))
        fail("isolation", `${path} contains ${marker} from the other environment`);
    for (const marker of SECRET_MARKERS)
      if (value.includes(marker))
        fail("secrets", `${path} contains the forbidden marker ${marker}`);
  }
}

async function writeTree(outDir, files, targetName, config) {
  const target = config.targets[targetName];
  const owned = [...MARKETPLACE_FILES, `plugins/${target.plugin}`];
  if (targetName === "prod") owned.push("server.json");
  if (targetName === "dev") owned.push("README.md", "LICENSE");
  for (const path of owned) await rm(join(outDir, path), { recursive: true, force: true });
  for (const [path, value] of files) {
    const destination = join(outDir, path);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, value);
  }
}

async function readTree(dir, prefix) {
  const files = new Map();
  async function walk(current) {
    if (!existsSync(current)) return;
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else files.set(relative(dir, full).split(sep).join("/"), await readFile(full));
    }
  }
  await walk(join(dir, prefix));
  return files;
}

function sameBytes(a, b) {
  return Buffer.compare(Buffer.from(a), Buffer.from(b)) === 0;
}

async function compareRoot(config, files) {
  const target = config.targets[config.rootTarget];
  const committed = await readTree(ROOT, `plugins/${target.plugin}`);
  const problems = [];
  for (const path of [...MARKETPLACE_FILES, "server.json"]) {
    if (!files.has(path)) continue;
    const full = join(ROOT, path);
    if (!existsSync(full)) problems.push(`missing ${path}`);
    else if (!sameBytes(await readFile(full), files.get(path))) problems.push(`stale ${path}`);
  }
  for (const [path, value] of files) {
    if (!path.startsWith(`plugins/${target.plugin}/`)) continue;
    if (!committed.has(path)) problems.push(`missing ${path}`);
    else if (!sameBytes(committed.get(path), value)) problems.push(`stale ${path}`);
  }
  for (const path of committed.keys())
    if (!files.has(path)) problems.push(`unexpected ${path}`);
  if (problems.length > 0)
    fail(
      "root",
      `committed ${config.rootTarget} output differs from a fresh build; run ` +
        `\`node scripts/sync.mjs build --target ${config.rootTarget} --out .\`:\n  ${problems.join("\n  ")}`,
    );
}

function compareSemver(a, b) {
  const [, aMaj, aMin, aPat, aPre] = SEMVER_PATTERN.exec(a);
  const [, bMaj, bMin, bPat, bPre] = SEMVER_PATTERN.exec(b);
  for (const [x, y] of [[aMaj, bMaj], [aMin, bMin], [aPat, bPat]])
    if (Number(x) !== Number(y)) return Number(x) - Number(y);
  if (aPre === bPre) return 0;
  if (aPre === undefined) return 1;
  if (bPre === undefined) return -1;
  return aPre < bPre ? -1 : 1;
}

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

async function versionRule(config, base) {
  if (!config.rootTarget) {
    console.log("version-rule: no generated root yet; nothing to check");
    return;
  }
  const target = config.targets[config.rootTarget];
  const paths = [...MARKETPLACE_FILES, "server.json", `plugins/${target.plugin}`];
  let changed = true;
  try {
    git("diff", "--quiet", base, "--", ...paths);
    changed = false;
  } catch {
    changed = true;
  }
  if (!changed) {
    console.log("version-rule: published output unchanged");
    return;
  }
  // Compare with what the base actually publishes, not its config.
  const baseVersion = JSON.parse(
    git("show", `${base}:plugins/${target.plugin}/.claude-plugin/plugin.json`),
  ).version;
  if (compareSemver(config.version, baseVersion) <= 0)
    fail(
      "version",
      `the published plugin changed but version ${config.version} is not greater than ${baseVersion}; bump plugin.config.json`,
    );
  console.log(`version-rule: ${baseVersion} -> ${config.version}`);
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = {};
  for (let i = 0; i < rest.length; i += 2) {
    if (!rest[i].startsWith("--") || rest[i + 1] === undefined)
      fail("usage", `bad argument ${rest[i]}`);
    options[rest[i].slice(2)] = rest[i + 1];
  }
  return { command, options };
}

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));
  const config = await loadConfig();
  const sources = await loadSources(config);
  const targetName = options.target;
  if (options.target !== undefined && !(targetName in config.targets))
    fail("usage", "--target must be dev or prod");

  switch (command) {
    case "build": {
      if (!targetName || !options.out) fail("usage", "build needs --target and --out");
      const version =
        options.version ?? (targetName === "prod" ? config.version : `${config.version}-dev.0`);
      const files = build(config, sources, targetName, version);
      await writeTree(resolve(options.out), files, targetName, config);
      console.log(
        JSON.stringify({ target: targetName, version, contentDigest: contentDigest(config, sources, targetName) }),
      );
      break;
    }
    case "check": {
      for (const name of ["prod", "dev"]) {
        const version = name === "prod" ? config.version : `${config.version}-dev.0`;
        const files = build(config, sources, name, version);
        if (config.rootTarget === name) await compareRoot(config, files);
      }
      console.log("check: prod and dev builds pass every rule");
      break;
    }
    case "digest": {
      if (!targetName) fail("usage", "digest needs --target");
      console.log(contentDigest(config, sources, targetName));
      break;
    }
    case "version-rule": {
      if (!options.base) fail("usage", "version-rule needs --base");
      await versionRule(config, options.base);
      break;
    }
    default:
      fail("usage", "command must be build, check, digest or version-rule");
  }
}

main().catch((error) => {
  console.error(error instanceof RuleError ? error.message : error);
  process.exit(1);
});
