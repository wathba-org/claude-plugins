# Wathba Dev

Connects Codex, Claude Code and other Agent Plugins clients to the Wathba development environment
over MCP. The member signs in through the browser (OAuth); no API key or token
ever goes through the chat.

- MCP server: https://apidev.wathba.info/mcp
- Guide: https://platformdev.wathba.info/docs/mcp

## Claude Code

```text
/plugin marketplace add wathba-org/wathba-plugin#dev
/plugin install wathba-dev@wathba-development
```

Run `/mcp`, choose `wathba-dev` and sign in. To receive updates
automatically, open `/plugin`, go to Marketplaces, select
`wathba-development` and choose Enable auto-update.

## Codex and the ChatGPT desktop app

```sh
codex plugin marketplace add wathba-org/wathba-plugin --ref dev
codex plugin add wathba-dev@wathba-development
```

Installing from the app's Plugins page starts sign-in. In a terminal, run
`codex mcp login wathba-dev`. Codex checks the marketplace for
updates when it starts.

## One connection

Use either this plugin or a direct MCP connection to https://apidev.wathba.info/mcp, not both,
or every Wathba tool appears twice.
