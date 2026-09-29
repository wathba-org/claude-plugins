# Wathba CLI command reference

Every command writes exactly one JSON object (`wathba.output.v1` on stdout or
`wathba.error.v1` on stderr) carrying `notices`, `noticesMore`,
`noticesStatus`, `noticesCoverage`, and `noticePolicy`. `--json` is a
compatibility alias; `--json=false`, `WATHBA_OUTPUT=text`, and `output: text`
return `CONFIGURATION_UNSUPPORTED`. Use `--no-input` for agent runs.
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
- `wathba completions bash|zsh|fish|powershell --output <file>` (writes the
  script to the file and returns its path, size, and digest)

## Notices

- `wathba notices list [--view attention|portfolio|focus] [--service <code>] [--limit 1-50] [--cursor <data.nextCursor>] [--portfolio-cursor <noticesCoverage.portfolioNextCursor>] [--locale en|ar]`

`attention` (default) merges account, the `--project` focus, and every other
authorized project. The page is in the envelope's notice fields; `data`
carries `nextCursor`. Read-only.

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

The backend assigns `member_workspace.v3`. Login accepts neither raw scopes nor
a selectable profile. Tokens stay in the OS keychain. Linux requires a
persistent D-Bus user session, Secret Service provider, and accessible unlocked
login/default collection. Windows uses Credential Manager and macOS uses
Keychain. `WATHBA_CREDENTIAL_PROVIDER=file` is not supported, and plaintext
token files are prohibited.

## Workspace and projects

- `wathba workspace show`
- `wathba project create --name <name> --idempotency-key <stable-key> [--repository-profile-digest <sha256>]`
- `wathba project list`
- `wathba project get <projectId>`
- `wathba project select <projectId> [--environment <environmentId>]`
- `wathba capability catalog`
- `wathba capability list --project <projectId> [--environment <environmentId>]`
- `wathba capability status <capabilityCode> --project <projectId> [--environment <environmentId>]`
- `wathba capability skill <capabilityCode>`
- `wathba capability operations <capabilityCode> --project <projectId> --environment <environmentId> --service <serviceCode>`
- `wathba capability validate <capabilityCode> --operation <operationId> --request <file> --project <projectId> --environment <environmentId> --service <serviceCode>`
- `wathba capability verify <capabilityCode> --mode contract|sandbox --idempotency-key <stable-key> --project <projectId> --environment <environmentId> --service <serviceCode>`

Project creation is a dedicated keychain-workspace command. It creates one
project plus one active sandbox and never creates a key, production resource,
service binding, provider connection, or provider effect.

## Services

The service surface is read-only:

- `wathba service list --project <projectId>`
- `wathba service status <serviceCode> --project <projectId> --environment <environmentId>`
- `wathba service wait <serviceCode> --until enabled --project <projectId> --environment <environmentId>`
- `wathba service skill <serviceCode> --project <projectId>`
- `wathba service recommend --project-dir <dir> [--target <app>] [--project <projectId>]`

Historical Authenta (`messaging.otp.authenta`) and Torod use member-wide operator
enablement. Authentica reseller (`messaging.otp.authentica`) requires the exact project's
Live environment setup in the member portal (Authentica is Live-only). `service status` and
`service wait` read its project binding, never historical Authenta enablement.
An active binding reports `ENABLED` and `runtimeReadiness: unchecked`; provider
readiness and Wallet funds remain separate runtime checks. Follow the returned
project action for other states; do not substitute another service code.
Moyasar is enabled per project. There are no CLI setup, browser-open,
reconcile, activation, deactivation, provider-readiness, or funding commands.

## Hosted MCP and agent workspace

- `wathba mcp [--api-url <url>]`
- `wathba integrate inspect --project-dir <dir>`
- `wathba integrate <capabilityCode> --project-dir <dir> --project <projectId> --environment <environmentId> --service <serviceCode> [--no-install-skill]`
- `wathba integrate cleanup --project-dir <dir>`

`mcp` prints deterministic remote-MCP/OAuth setup for Replit, Claude Code,
Codex, Inspector, and generic hosts. It does not authorize a host itself.
The base grant requests only `mcp:read`. The guidance also reports
`protocolVersion` (`2026-07-28`) and the JSON-only result format. The hosted
MCP serves no domain tools for now.

Inspection and cleanup are local and read-only. Recommendation sends only a
bounded, value-free `RepositoryProfileV1` to the shared catalog policy.
`integrate` retrieves and strictly checks the pinned bundle and installs its
exact signed skill by default. Pass the discovered `serviceCode` as `--service`
to `integrate` and to `capability operations`, `validate`, and `verify`
(`capability list`, `status`, and `skill` reject it); without it the CLI falls back
to its built-in default service (managed `messaging.otp.wathba` for
`messaging.otp`). The CLI selects the contract version from the service
(Authentica 4, Ejar 3, others 2); never override or downgrade it with
`--contract-version`. It never uploads source, patches the
member app, executes a runtime operation, or tracks progress. Local validation
uploads no request body. Sandbox verification requires
`--accept-provider-effect`; contract verification has no provider effect.

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

## Member domains

- `wathba domain list [--project <projectId>]`
- `wathba domain show <domainId>`
- `wathba domain open [<domainId>] [--project <projectId>]`
- `wathba domain subscription show <domainId>`
- `wathba domain dns list <domainId>`
- `wathba domain dns preview <domainId> --change <file> --domain-version <n> --zone-version <n> --attachment-version <n> --project <projectId>`
- `wathba domain dns request <domainId> --change <file> --domain-version <n> --zone-version <n> --attachment-version <n> --preview-digest <sha256> --idempotency-key <stable-key> --project <projectId>`
- `wathba domain nameserver list <domainId>`
- `wathba domain nameserver preview <domainId> --servers <file> --domain-version <n> --zone-version <n> --attachment-version <n> --project <projectId>`
- `wathba domain nameserver request <domainId> --servers <file> --domain-version <n> --zone-version <n> --attachment-version <n> --preview-digest <sha256> --idempotency-key <stable-key> --project <projectId>`
- `wathba domain action get <actionId>`
- `wathba domain action wait <actionId> [--wait-timeout <duration>] [--poll-interval <duration>]`

The CLI reads and proposes only. Member ownership is separate from project
attribution; `--project` on list is only a filter, while mutations pin the
active attachment version. It has no registration, purchase, approval,
dispatch, registrant-profile, national-ID, CR, document, or provider-credential
command. Request output is `approval_required`; the member reviews and decides
the immutable action in the returned portal URL. `domain open` is a
credential-free portal handoff, subscription reads are safe metadata only, and
action wait is bounded read-only polling. See `references/domains.md`.

## Updates

- `wathba update check`
- `wathba self-update [--channel stable|beta] [--verify-only] [--rollback]`

## Exit codes

| Code | Meaning |
|---:|---|
| 0 | Command completed; inspect the typed outcome |
| 2 | Invalid input or missing context |
| 3 | Authentication/authorization required |
| 4 | Permission denied |
| 5 | Not found |
| 6 | Network error |
| 7 | Timeout |
| 8 | Conflict or replay mismatch; re-read status |
| 9 | Verification failed or remains required |
| 10 | Update failed |
| 11 | Protocol incompatible; stop on contract drift |
