# Wathba

This package connects Codex or Claude Code to the prod Wathba environment.
It bundles the canonical Wathba skill and one read-only OAuth MCP server:

- MCP: https://api.wathba.info/mcp
- Portal: https://platform.wathba.info
- Scope: `mcp:read`

## Codex

```sh
codex plugin marketplace add wathba-org/claude-plugins
codex plugin add wathba@wathba
```

Then run `codex mcp login wathba` to sign in and approve the read-only grant
in your browser. Codex keeps the OAuth credentials outside the agent context.

## Claude Code

```sh
claude plugin marketplace add wathba-org/claude-plugins
claude plugin install wathba@wathba
```

The browser performs member sign-in and consent. Never paste OAuth tokens,
project API keys, production credentials, or provider secrets into a chat.

## Notices

Every Wathba MCP result carries notices, noticesStatus, noticesCoverage and
noticePolicy. Call `list_notices` at the start of a Wathba task and at every
checkpoint, and follow this policy (wathba.agent-notices.v1):

Proactively tell the member about new notices across all authorized projects, including projects other than the one being edited. Present confirmed production blockers immediately, current-task blockers before dependent actions, and other activation blockers or warnings at the next useful checkpoint; summarize information without interruption. Name the affected project and consequence, ask the supplied question when action is needed, respect prior choices and consent, and never treat incomplete checks as an all-clear.
