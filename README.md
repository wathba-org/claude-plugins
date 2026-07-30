# Wathba Claude Code plugins

Official [Wathba (وثبة)](https://wathba.info) plugin marketplace for Claude
Code and Codex.

## Install

Claude Code:

```text
/plugin marketplace add wathba-org/claude-plugins
/plugin install wathba
```

Codex support is added to the same plugin folder when the production Wathba
MCP and portal endpoints are live. Until then, this public package remains the
existing Claude Code CLI skill and does not point users at development.

## Plugins

### wathba

Teaches Claude Code to install and operate the Wathba CLI: authenticate (`wathba login --device`), create projects, activate services (OTP messaging, payments, shipping), integrate capabilities into your app, manage API keys, and verify results — with prompts in **Arabic or English**, answered in your language.

The Wathba member portal gives non-technical builders a host-specific setup
button. The commands above remain the explicit fallback for developers and
operators.

## Source of truth

Skill content is mirrored from [`wathba-org/wathba-cli`](https://github.com/wathba-org/wathba-cli) on each release. Change the skill there, not here.

The same CLI repository generates the dual-host production plugin. Its governed
promotion workflow will open an idempotent pull request here only after the
production OAuth/MCP metadata passes and the package contains no development
hostname or identity.
