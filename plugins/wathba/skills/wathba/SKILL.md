---
name: wathba
description: "Install and operate the Wathba (وثبة) CLI and hosted read-only MCP for credential-safe member project discovery, pinned capability integration guidance, repository detection, webhooks, and safe API-key metadata. Use whenever the user mentions Wathba, وثبة, wathba-cli, Wathba MCP, a Wathba service or capability, or asks in Arabic or English to connect OTP, payments, shipping, Moyasar, Torod, or Authenta through Wathba."
---

# Wathba CLI

Use `wathba` as the agent interface to Wathba. Respond in the user's language;
keep commands, IDs, codes, URLs, and JSON fields in Latin script.

## Core safety rules

1. Use `--json` and normally `--no-input`. Parse the envelope; do not scrape
   human help text.
2. Inspect the typed outcome as well as the exit code.
3. Never ask for, receive, print, store, or paste a project API key, provider
   credential, password, cookie, signing secret, raw card data, protected
   document, funding detail, or raw provider payload.
4. Never invent a provider route or operation. Use `wathba manifest --json`,
   `wathba api operations --json`, and the verified signed service manifest.
5. Service onboarding is operator-owned for the MVP. Do not search for or
   invent member `setup`, `open`, `reconcile`, `activate`, or `deactivate`
   commands.
6. Treat `wathba service list --json --no-input` as the only current service
   inventory. Named services in these bundled references are integration
   examples, not availability claims. If a service is absent, do not advertise,
   inspect, install, or integrate it; treat a direct not-found response the same
   way.
7. Treat `KEYRING_UNAVAILABLE` as a local credential-store infrastructure
   failure and stop. Never create a plaintext fallback, never suggest
   `WATHBA_CREDENTIAL_PROVIDER=file`, and never start daemons or modify the
   member's shell automatically.
8. Prefer the hosted read-only MCP for project and integration documentation.
   It must never receive or return a test key, live key, or provider credential.
   Project/environment/key creation and production approval remain human portal
   actions.

## Installation

Prefer the official zero-dependency npm package; fall back to the native
installer scripts only when npm (Node.js 18.18+) is unavailable or the npm
install fails. Do not use Homebrew or customer GitHub Release assets directly:

```sh
# Preferred: npm on macOS, Linux, or Windows (Node.js 18.18+)
npm install --global @wathba-cli/cli
```

```sh
# Fallback: macOS / Linux
curl -fsSL https://install.wathba.info/install.sh | bash

# Fallback: Windows PowerShell
irm https://install.wathba.info/install.ps1 | iex
```

The native installer writes the binary to `$HOME/.wathba/bin` and installs this
skill plus the signed `wathba-integration` bootstrap skill. npm installs the
same authenticated native binary inside `@wathba-cli/cli`, exposes `wathba`,
and intentionally does not write agent skills outside the package. For npm,
install them explicitly when needed:

```sh
wathba skill agent install --json --no-input
wathba skill bootstrap install --json --no-input
```

Pin a native channel or version with `WATHBA_CHANNEL=beta` or
`WATHBA_VERSION=v1.4.0`; use `@beta` or an exact npm version for npm.

Always bring the CLI to the latest release after a first install, and again
before using its MCP guidance: run `wathba update check --json`, and if an
update is available, apply it with the method that owns the install — `npm
install --global @wathba-cli/cli@latest` for npm-managed installs, `wathba
self-update` for native installs (`wathba self-update` refuses npm-managed
installs). Both installation paths verify signed artifacts; never bypass
verification. Then run:

```sh
hash -r
if ! command -v wathba >/dev/null 2>&1; then
  export PATH="$PATH:$HOME/.wathba/bin"
fi
if command -v which >/dev/null 2>&1; then
  which -a wathba
else
  command -v wathba
fi
wathba version --json
wathba doctor --json
```

Never prepend `$HOME/.wathba/bin` after an npm installation: that can shadow a
newer npm-managed CLI with an older native binary. `doctor` reports the
shell-selected executable and warns when another Wathba installation may be
shadowed.

## Authenticate and select context

When a portal-generated prompt supplies a pairing code, run:

```sh
wathba login --pairing-code <code> --wait --no-input --json
wathba auth status --json
wathba workspace show --json --no-input
wathba project select <projectId> --environment <environmentId> --json
```

Tell the member to approve the computer on the Wathba page they already have
open. Do not relay an approval URL or user code, and do not run `wathba auth
complete`; the bound login waits for approval and stores the tokens itself.

When no pairing code is supplied, use the manual fallback:

```sh
wathba login --no-input --json
# After the member approves the code in Wathba:
wathba auth complete --no-input --json
wathba auth status --json
wathba workspace show --json --no-input
wathba project select <projectId> --environment <environmentId> --json
```

The backend assigns the fixed `member_workspace.v2` profile; login never accepts
raw scopes or a selectable profile. Tokens stay in the OS keychain. Workspace
commands reject `--token` and `WATHBA_TOKEN`. MCP uses a separate OAuth
authorization flow and the narrow `mcp:read` scope. In a manual agent run
without a pairing code, present the safe approval URL and code to the member,
then use `wathba auth complete --no-input --json` after approval.

Before login, require a successful `wathba doctor --json`. On Linux, the same
persistent D-Bus user session, Secret Service provider, and accessible unlocked
login/default collection must survive `login`, approval, `auth complete`, and
later commands; do not create a fresh `dbus-run-session` for each command.
Windows uses native Credential Manager and macOS uses native Keychain, with no
Linux desktop requirement. `KEYRING_UNAVAILABLE` means that infrastructure is
not usable; `NOT_AUTHENTICATED` means it is usable but no valid Wathba session
exists.

## Service enablement

First read the live service inventory. Wathba backoffice operators complete
provider onboarding and enable services returned there:

- Authenta/Authentica and Torod: enable once for the member; all member projects
  can use them.
- Moyasar-backed payments: enable separately for each project.

The member/agent commands are read-only:

```sh
wathba service list --project <projectId> --json --no-input
wathba service status <serviceCode> --project <projectId> --environment <environmentId> --json --no-input
wathba service wait <serviceCode> --until enabled --project <projectId> --environment <environmentId> --json --no-input
wathba service skill <serviceCode> --project <projectId> --json --no-input
```

If the live inventory contains the service but it is not enabled, report the
exact operator action from the output. Do not claim the member can fix it from
the CLI. Status and wait never mutate provider state.

## Use the hosted MCP

```sh
wathba mcp --api-url https://api.wathba.info --json
```

The command prints deterministic setup for Replit, Claude Code, Codex, MCP
Inspector, and any remote-MCP host. Authorize the host in the browser with the
narrow `mcp:read` scope. The MCP exposes exactly these read-only tools:

- `list_projects`
- `get_project_setup`
- `list_project_services`
- `get_service_integration_docs`
- `get_service_operations`
- `get_service_troubleshooting`

Its resource templates are `wathba://projects/{projectId}/setup`,
`wathba://projects/{projectId}/services/{serviceCode}/integration`, and
`wathba://projects/{projectId}/services/{serviceCode}/operations`. Use the
pinned facts returned by the tools; never infer a service, skill, operation, or
production status.

## Detect and integrate the repository

```sh
wathba integrate inspect --project-dir . --json --no-input
wathba integrate <capabilityCode> --project-dir . --json --no-input
```

Both forms are read-only. They do not authenticate, make a network request,
upload repository content, install a package, write source, or track progress.
The second form returns `MCP_REQUIRED` and the same repository assessment.

Detection covers TypeScript, JavaScript, Python, Java, Go, PHP, .NET,
cURL-oriented, and unknown repositories. For TypeScript/JavaScript, follow the
exact SDK pin returned by MCP. For every other language, follow its direct HTTP
guide. Patch and test the member's application with the normal tools for that
repository; Wathba does not claim a local `READY` state.

Ignore legacy `.wathba/integration.lock` and `.wathba/integration.json`
contents. To list them without deletion:

```sh
wathba integrate cleanup --project-dir . --json --no-input
```

After local tests pass, explain the portal handoff. The member creates the
production environment, obtains required approval, creates the test or live API
key, and puts it directly into the trusted server-side secret store. The agent
must not ask the member to paste that key.

## Runtime and API keys

Runtime operations execute from the member application's trusted server with a
separate project/environment API key. An authorized human creates and reveals
that key once at `/app/projects/<projectId>/keys` and configures it directly on
the server outside the agent's view.

The fixed workspace profile includes `keys:read` and intentionally excludes
`keys:manage`. An agent may use only `wathba key list --project <projectId>
--json` for safe metadata. Key creation, rotation, revocation, suspension,
reactivation, and compromise handling are protected portal actions. A workspace
agent must not invoke them or seek a broader token.

The runtime path is member app → Wathba → server-side provider credential →
provider → normalized response. The agent never calls the provider directly.

## Torod

Only when the live inventory contains `shipping.torod`, Torod is
operator-enabled once per member. The CLI has no Torod login, plugin,
address, readiness-refresh, wallet-facts, funding-link, or wallet-funding flow.
Funding remains between the member and Torod through Torod's operation.

All Wathba-supported Torod runtime operations come from the signed service
manifest. If a runtime result is pending or ambiguous, poll the same Wathba
execution; do not issue a duplicate shipment as a probe.

## Webhooks

Webhooks are retained. The member configures a Wathba delivery endpoint and
subscriptions. Wathba registers supported provider webhooks using server-held
credentials, verifies inbound callbacks, deduplicates and normalizes them, and
delivers signed member events. Never request a provider webhook secret.

Manage member endpoints with `wathba webhook register|list|verify|disable`
and inspect delivery status with `wathba webhook deliveries`. The endpoint
signing secret is portal-only; the CLI always redacts it. Follow
`references/webhooks.md` for registration, signature verification,
deduplication, and authoritative state confirmation.

## Troubleshooting

- Authentication required: run `wathba login --no-input --json`, ask the member
  to approve it, then run `wathba auth complete --no-input --json`.
- Disabled service: report whether the Wathba operator must enable it for the
  member or selected project; optionally use `service wait --until enabled`.
- Repository mismatch: run `wathba integrate inspect --project-dir . --json
  --no-input`, then request the pinned MCP guide for the detected stack.
- Protocol/signature failure: stop. Do not bypass verification.
- Unknown command or flag: inspect `wathba manifest --json` or command help.
- Wathba bug or unresolvable blocker: stop and tell the member what failed
  and why, then offer to report it to Wathba. Prepare a sanitized,
  member-safe summary with no secrets, tokens, or customer data.
  Agent-submitted feedback is consent-gated: a human must grant standing
  consent at an interactive terminal first, and without that consent the
  member reviews and sends the report themselves with `wathba feedback`.

## References

- `references/commands.md` — command and flag reference.
- `references/workflows.md` — end-to-end operator-enablement, integration,
  runtime, and webhook workflows.
- `references/payments.md` — payments capability runbook: checkout contract,
  idempotency, status confirmation, refunds, modes, and verification.
- `references/webhooks.md` — member webhook runbook: endpoint registration,
  signature verification, deduplication, and delivery inspection.
- `references/arabic-glossary.md` — Arabic intent mapping and response style.
