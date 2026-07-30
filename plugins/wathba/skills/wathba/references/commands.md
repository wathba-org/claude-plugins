# Wathba CLI command reference

Use `--json` for deterministic envelopes and `--no-input` for agent runs.
Global context flags include `--project`, `--environment`, `--api-url`,
`--config`, `--timeout`, and `--idempotency-key`. Flag values override
environment variables, which override non-secret config.

## Discovery and diagnostics

- `wathba version`
- `wathba doctor [--check <name>]`
- `wathba manifest`
- `wathba schema list`
- `wathba schema get <operationId>`
- `wathba api operations`
- `wathba api call <operationId> --input <file>`
- `wathba completions bash|zsh|fish|powershell`

Raw calls accept only operations classified as agent-safe. Interactive-only,
operator, provider-onboarding, and secret-bearing operations fail locally.

Default `doctor` checks native credential-store readiness. On failure it returns
`KEYRING_UNAVAILABLE` with stable platform, provider, reason, remediation, and
retry details. On a healthy store, absence of a Wathba session is not a doctor
failure; auth commands report `NOT_AUTHENTICATED` instead. `doctor --check
jwks` retains the dedicated API/JWKS diagnostic.

## Authentication

- `wathba login [--wait]`
- `wathba auth status`
- `wathba auth complete --no-input --json`
- `wathba auth refresh`
- `wathba auth logout`
- `wathba auth sessions`
- `wathba auth session revoke <sessionId>`

The backend assigns `member_workspace.v2`. Login accepts neither raw scopes nor
a selectable profile. Tokens stay in the OS keychain. Linux requires a
persistent D-Bus user session, Secret Service provider, and accessible unlocked
login/default collection. Windows uses Credential Manager and macOS uses
Keychain. `WATHBA_CREDENTIAL_PROVIDER=file` is not supported, and plaintext
token files are prohibited.

## Workspace and projects

- `wathba workspace show`
- `wathba project create --name <name>`
- `wathba project list`
- `wathba project get <projectId>`
- `wathba project select <projectId> [--environment <environmentId>]`
- `wathba capability catalog`
- `wathba capability list --project <projectId> [--environment <environmentId>]`
- `wathba capability status <capabilityCode> --project <projectId> [--environment <environmentId>]`
- `wathba capability skill <capabilityCode>`
- `wathba capability verify <capabilityCode>`

## Services

The service surface is read-only:

- `wathba service list --project <projectId>`
- `wathba service status <serviceCode> --project <projectId> --environment <environmentId>`
- `wathba service wait <serviceCode> --until enabled --project <projectId> --environment <environmentId>`
- `wathba service skill <serviceCode> --project <projectId>`

Authenta/Authentica and Torod are enabled once per member by a Wathba operator.
Moyasar is enabled per project. There are no CLI setup, browser-open,
reconcile, activation, deactivation, provider-readiness, or funding commands.

## Hosted MCP and repository detection

- `wathba mcp [--api-url <url>]`
- `wathba integrate inspect --project-dir <dir>`
- `wathba integrate <capabilityCode> --project-dir <dir>`
- `wathba integrate cleanup --project-dir <dir>`

`mcp` prints deterministic remote-MCP/OAuth setup for Replit, Claude Code,
Codex, Inspector, and generic hosts. It does not authorize a host itself.

The `integrate` command family is local and read-only. It makes no Wathba API
request, uploads no repository content, and writes no file. The capability form
returns `MCP_REQUIRED`. `cleanup` lists legacy `.wathba` integration artifacts
without deleting them.

## Skills

- `wathba skill resolve <skillId> --version <version> --digest sha256:<hex>`
- `wathba skill install <skillId> --version <version> --digest sha256:<hex> [--target-dir <dir>]`
- `wathba skill bootstrap install [--target-dir <dir>]`
- `wathba agent install [--target-dir <dir>]`

Artifact signatures, digests, publisher identities, and revocation state are
mandatory. Never bypass trust checks.

## API-key metadata

- `wathba key list`

The key secret is created/revealed once to the authorized human in the portal
The workspace profile includes `keys:read` and intentionally excludes
`keys:manage`. Key creation, rotation, revocation, suspension, reactivation, and
compromise handling are protected portal actions. A workspace agent must not
invoke them.

## Webhooks

- `wathba webhook register <url> --project <projectId> --environment <environmentId>`
- `wathba webhook list --project <projectId>`
- `wathba webhook verify <endpointId> <challenge>`
- `wathba webhook disable <endpointId>`
- `wathba webhook deliveries --project <projectId> [--endpoint <endpointId>] [--state <state>] [--limit <n>]`

Register, verify, and disable are state-changing and require
`--idempotency-key`. The endpoint signing secret is portal-only and always
redacted; endpoint listings expose a URL hash, never the raw URL. See
`references/webhooks.md`.

## Updates

- `wathba update check`
- `wathba self-update [--channel stable|beta] [--verify-only] [--rollback]`

## Exit codes

| Code | Meaning |
|---:|---|
| 0 | Command completed; inspect the typed outcome |
| 2 | Invalid input or missing context |
| 3 | Authentication/authorization required |
| 4 | Remote or transport failure |
| 5 | Verification/protocol incompatibility |
| 6 | Local install/filesystem failure |
| 8 | Conflict or replay mismatch; re-read status |
