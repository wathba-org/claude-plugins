# Wathba CLI — Full Command Reference

Binary: `wathba`. Root help: "Wathba is an agent-first CLI for installing, authenticating, configuring, and verifying Wathba capabilities."

## Global persistent flags (every command)

| Flag | Meaning |
|---|---|
| `--json` | Deterministic JSON envelopes (always use as an agent) |
| `--no-input` | Never prompt or open a browser; print resume commands instead |
| `--config <path>` | Config file override (default `$(UserConfigDir)/wathba/config.json`) |
| `--api-url <url>` | API base (default `https://api.wathba.info`; dev `https://apidev.wathba.info`) |
| `--token <t>` | Bearer token (rejected by `integrate` commands) |
| `--project <id>` | Project context |
| `--environment <env>` | Environment context |
| `--idempotency-key <k>` | Replay-safe mutations |
| `--install-base-url <url>` | Distribution host (default `https://install.wathba.info`) |
| `--timeout <dur>` | Request timeout (default 30s) |
| `--verbose` | Verbose logs (stderr) |
| `--version` | Print version |

## Environment variables

`WATHBA_API_URL`, `WATHBA_CONFIG`, `WATHBA_OUTPUT` (text|json), `WATHBA_NO_INPUT`, `WATHBA_TOKEN`, `WATHBA_PROJECT`, `WATHBA_ENVIRONMENT`, `WATHBA_TIMEOUT`, `WATHBA_INSTALL_BASE_URL`.

Precedence: **CLI flags > env vars > config file > defaults**.

## Commands

### Diagnostics & self-description
- `wathba version` — version + build metadata.
- `wathba doctor [--check <name>]` — local diagnostics (e.g. `--check jwks`).
- `wathba manifest` — machine-readable manifest of commands, flags, exit codes, schemas, operations (`schema_version: wathba.manifest.v1`).
- `wathba schema list` / `wathba schema get <operationId>` — operation schemas.
- `wathba api operations` — list raw platform operations.
- `wathba api call <operationId> [--input <file>]` — invoke an operation by ID.
- `wathba docs [--output-dir docs/generated]` — generate command docs.
- `wathba completions bash|zsh|fish|powershell` — shell completions.
- `wathba protected probe [--api-key <k>]` — probe the protected execute route.

### Config
- `wathba config get [key]` / `wathba config set <key> <value>` — non-secret local config only. Keys: `api_url`, `output`, `no_input`, `project`, `environment`, `timeout`, `install_base_url`. Tokens are NEVER stored in config.

### Auth (OAuth device flow; tokens in OS keychain)
- `wathba login --device [--wait]` — only `--device` is supported. Integration-context flags: `--capability <code>` (repeatable), `--integration-framework`, `--integration-destination`, `--integration-cost-class`, `--integration-run-ref`.
- `wathba auth status` · `auth sessions` · `auth complete` · `auth refresh` · `auth logout` · `auth session revoke <sid>`.

### Projects
- `wathba project create [--name <n>]` · `project list` · `project get <projectId>` · `project select <projectId>` (persists default project/environment).

### Services (platform-side lifecycle)
- `wathba service list`
- `wathba service setup <serviceCode>` — may return `SETUP_NOT_REQUIRED` (no mutation needed).
- `wathba service status <serviceCode>`
- `wathba service wait <serviceCode> --until ready|removed`
- `wathba service open <serviceCode>` — dashboard handoff (channel-validated URL, never a raw provider URL).
- `wathba service activate <serviceCode>` / `service deactivate <serviceCode>`
- `wathba service skill <serviceCode>` — service-specific skill.

### Capabilities
- `wathba capability skill <capabilityCode>` — fetch the capability's skill.
- `wathba capability verify <capabilityCode>` — verify a capability end-to-end.

### Skills (signed artifacts)
- `wathba skill resolve <skillId> --version <v> --digest sha256:<hex>` — digest MUST start with `sha256:`.
- `wathba skill install <skillId> --version <v> --digest sha256:<hex> [--target-dir <dir>]`
- `wathba skill bootstrap install [--target-dir <dir>]` — (re)install the signed `wathba-integration` bootstrap skill.

### Integrate (app-side; requires keychain device session — rejects `--token`/`WATHBA_TOKEN`)
Persistent flags: `--project-dir <dir>` (default `.`), `--credential-destination` (default `local_mock`), `--credential-destination-id`, `--acknowledge-migration-digest`.
- `wathba integrate <capabilityCode>` — start/continue integration.
- `wathba integrate resume <capabilityCode>` — continue after `ACTION_REQUIRED`/`PENDING`/`BLOCKED`.
- `wathba integrate status <capabilityCode>` · `verify` · `repair` · `upgrade` · `rollback` · `remove <capabilityCode>`.

### Keys
- `wathba key create [--environment <e>] [--env test]`
- `wathba key list`
- `wathba key revoke|suspend|reactivate|compromise <keyId>`
- `wathba key rotate <keyId> [--overlap-seconds 300]`
- `wathba key activation complete <keyId>` · `key activation reissue-secret <keyId>`

### Updates
- `wathba update check [--channel stable|beta] [--version <v>]`
- `wathba self-update [--channel stable|beta] [--version <v>] [--verify-only] [--rollback]` — `--verify-only`/`--rollback` and `--version`/`--rollback` are mutually exclusive.

### Feedback (human-only)
- `wathba feedback --title <t> --description <d>` — requires a real TTY; rejects `--no-input` and `--idempotency-key`; there is no agent bypass. Ask the user to run it themselves.

## Output contract

- Success: `{"schema_version":"wathba.output.v1","ok":true,"data":{...}}` on stdout.
- Failure: `{"schema_version":"wathba.error.v1","ok":false,"error":{"code","message","hint","details"}}`.
- Logs/errors → stderr. Secrets are redacted everywhere.

## Exit codes

| Code | Meaning | Agent action |
|---|---|---|
| 0 | Success — but inspect `data.outcome` | Continue per outcome |
| 1 | General error | Read `error.hint` |
| 2 | Invalid input / missing context | Fix flags/args; set project/environment |
| 3 | Not authenticated | `wathba login --device --wait` |
| 4 | Permission denied | Report to user; may need dashboard role |
| 5 | Not found | Check code/ID via `service list` / `api operations` |
| 6 | Network / decode | Retry with backoff; check `--api-url` |
| 7 | Timeout | Increase `--timeout`; use `service wait` |
| 8 | Conflict / replay / activation race | Journal advanced elsewhere — run `status`, resume from reality |
| 9 | Verification failed | Run `repair` or report |
| 10 | Update failed | `self-update --rollback` if needed |
| 11 | Protocol incompatible | `self-update`, then retry |

## Installer contract (install.sh / install.ps1 / install.cmd)

- `WATHBA_INSTALL_OUTPUT=human|json` (default human). JSON = NDJSON events, `schema_version: wathba.installer.event.v1`, fields: `phase`, `status`, `artifact`, `bytes_downloaded`, `outcome`, `version`, `error`. Terminal `outcome`: `installed | updated | already_installed | failed` (+ `error.code`).
- Network policy env vars (positive integers): `WATHBA_INSTALL_CONNECT_TIMEOUT_SECONDS` (15), `WATHBA_INSTALL_MAX_TIME_SECONDS` (600), `WATHBA_INSTALL_LOW_SPEED_TIME_SECONDS` (30), `WATHBA_INSTALL_LOW_SPEED_LIMIT_BYTES` (1024), `WATHBA_INSTALL_RETRIES` (3), `WATHBA_INSTALL_RETRY_DELAY_SECONDS` (2).
- Retries never weaken trust: signatures (pinned Cosign 3.0.6, SHA-256-verified) are checked before anything is used.
- Install dirs: binary → `WATHBA_INSTALL_DIR` (default `$HOME/.wathba/bin`); bootstrap skill → `WATHBA_CODEX_SKILLS_DIR` (default `$HOME/.agents/skills`).
- Supported: macOS/Linux x86_64+arm64; Windows via zip. Requires `curl` and `openssl`.
