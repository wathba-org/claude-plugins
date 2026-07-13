# Wathba Claude Code plugins

Official [Wathba (وثبة)](https://wathba.info) plugin marketplace for Claude Code.

## Install

```text
/plugin marketplace add wathba-org/claude-plugins
/plugin install wathba
```

## Plugins

### wathba

Teaches Claude Code to install and operate the Wathba CLI: authenticate (`wathba login --device`), create projects, activate services (OTP messaging, payments, shipping), integrate capabilities into your app, manage API keys, and verify results — with prompts in **Arabic or English**, answered in your language.

Non-technical users don't need this marketplace at all: the official installer (`curl -fsSL https://install.wathba.info/install.sh | bash`) ships the same skill with the CLI, signature-verified and version-locked to the binary.

## Source of truth

Skill content is mirrored from [`wathba-org/wathba-cli`](https://github.com/wathba-org/wathba-cli) on each release. Change the skill there, not here.
