# Wathba agent plugin

The official [Wathba (وثبة)](https://wathba.sa) plugin for AI coding agents.
It connects Codex, the ChatGPT desktop app, Claude Code and other Agent Plugins
clients to Wathba's hosted MCP server, and adds one short skill that tells the
agent how to use it. Payments, OTP/SMS, KYC, ZATCA e-invoicing and shipping
reach your app through Wathba; the plugin never handles API keys, and members
sign in through the browser (OAuth).

| Environment | Branch | Install id | MCP server |
|---|---|---|---|
| Production | `main` | `wathba@wathba` | `https://api.wathba.info/mcp` |
| Development | `dev` | `wathba-dev@wathba-development` | `https://apidev.wathba.info/mcp` |

## Install

### Claude Code

```text
/plugin marketplace add wathba-org/wathba-plugin
/plugin install wathba@wathba
```

For the development environment, add `wathba-org/wathba-plugin#dev` and
install `wathba-dev@wathba-development`. Then run `/mcp`, choose the Wathba
server and sign in. To get updates automatically, open `/plugin`, go to
Marketplaces, select the marketplace and choose Enable auto-update.

### Codex and the ChatGPT desktop app

```sh
codex plugin marketplace add wathba-org/wathba-plugin
codex plugin add wathba@wathba
```

For the development environment, add `--ref dev` and install
`wathba-dev@wathba-development`. Installing from the app's Plugins page starts
sign-in; in a terminal, run `codex mcp login wathba` (or `wathba-dev`). Codex
checks the marketplace for updates when it starts.

### Any other MCP client

Add the remote MCP server URL from the table above with the Streamable HTTP
transport; the client discovers Wathba's OAuth settings on its own. Claude
(web, Desktop and Cowork) and ChatGPT take it as a custom connector. Use either
the plugin or a direct connection, not both, or every Wathba tool appears
twice.

## How this repository works

Nothing under `plugins/`, `.claude-plugin/`, `.agents/` or `contract.json` is
edited by hand. They are generated from two sources:

- `plugin.config.json`: identities, origins, version, branding and listing text.
- `src/`: the shared skill (`src/skills/wathba/SKILL.md`), the icon, and the
  README for the `dev` branch.

`scripts/sync.mjs` builds one marketplace per environment and enforces the
packaging rules: identities, paths, one MCP server per package with no headers
or scopes, environment isolation, no credentials, the skill's tool list, and the
icon hash.

| Workflow | When | What it does |
|---|---|---|
| `validate` | Every PR, push to `main`, weekly | Generator rules, version rule, then installs both builds into throwaway Claude Code and Codex homes, then checks the live OAuth metadata |
| `publish-dev` | Push to `main` | Builds the development marketplace, verifies it, and publishes it to the `dev` branch |
| `drift` | Daily | Checks both environments' live OAuth metadata and opens an issue when it stops matching |

The packages carry no scopes. The Wathba server decides the grant: every
connection gets full agent access, and the consent page shows exactly what
that allows.

## Change the plugin

1. Edit `plugin.config.json` or `src/`.
2. Run `node scripts/sync.mjs check`.
3. If the production package changes, raise `version` in
   `plugin.config.json`. CI refuses a changed package with the same version,
   because Claude Code updates only when the version changes.
4. Open a pull request. Every change here reaches members' agents, so the
   owner's review is required.

`contract.json` lists the Wathba tools the skill names. The platform's CI reads
it and fails a backend change that would remove or rename one of them.

## Acceptance

`docs/acceptance/` records the real host journeys (sign-in, reads, project
creation, replay, recovery, update, rollback). A host is listed as supported
only after a recorded run.

## License

Apache-2.0
