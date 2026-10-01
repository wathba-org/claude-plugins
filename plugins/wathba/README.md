# Wathba

Connects Codex, Claude Code and other Agent Plugins clients to Wathba
over MCP. The member signs in through the browser (OAuth); no API key or token
ever goes through the chat.

- MCP server: https://api.wathba.info/mcp
- Guide: https://platform.wathba.info/docs/mcp

## Claude Code

```text
/plugin marketplace add wathba-org/wathba-plugin
/plugin install wathba@wathba
```

Run `/mcp`, choose `wathba` and sign in. To receive updates
automatically, open `/plugin`, go to Marketplaces, select
`wathba` and choose Enable auto-update.

## Codex and the ChatGPT desktop app

```sh
codex plugin marketplace add wathba-org/wathba-plugin
codex plugin add wathba@wathba
```

Installing from the app's Plugins page starts sign-in. In a terminal, run
`codex mcp login wathba`. Codex checks the marketplace for
updates when it starts.

## One connection

Use either this plugin or a direct MCP connection to https://api.wathba.info/mcp, not both,
or every Wathba tool appears twice.
