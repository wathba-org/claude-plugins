# Wathba governed MCP and CLI agent-workspace workflow

Every response is one JSON object; normally add `--no-input`. Keep
credentials outside the agent.

## 0. Check member-wide notices first

After authentication, before any project work, read notices for the account
and every authorized project, even when a project is already selected:

```sh
wathba notices list --json --no-input
```

Over MCP call `list_notices`. While `data.nextCursor` (MCP `result.nextCursor`)
is set, repeat the same call (same view and project) with that `cursor` and no
portfolio cursor; then continue `noticesCoverage.portfolioNextCursor` with
`--view portfolio --portfolio-cursor <cursor>` until that is null too. Follow
the `noticePolicy` in every response: report production blockers in any
project in your next message, current-task blockers before dependent steps,
other activation blockers and warnings at the next checkpoint, and info in
summaries. Repeat this check after setup, activation, or verification, on a
project switch, after remediation, and before the final handoff.

## 1. Discover MCP setup

```sh
wathba mcp --api-url https://api.wathba.info --json
```

The response contains setup for:

- Replit: add a custom remote MCP URL and complete browser OAuth.
- Claude Code: `claude mcp add --transport http wathba
  https://api.wathba.info/mcp`, then authorize with `/mcp`.
- Codex: `codex mcp add wathba --url https://api.wathba.info/mcp`, then
  `codex mcp login wathba --scopes mcp:read`.
- MCP Inspector: connect to the same Streamable HTTP endpoint and complete
  OAuth.
- Any other host: use Streamable HTTP, OAuth authorization code with PKCE, and
  the `mcp:read` scope.

Do not put a Wathba CLI token or project API key in the MCP host configuration.

The base grant is intentionally limited to integration guidance. The hosted MCP
serves no domain tools for now; use the `wathba domain` CLI runbook for
member-domain work.

## 2. Recommend a service and resolve a project

From the repository root, run:

```sh
wathba service recommend --project-dir . --json --no-input
```

The exact outbound `RepositoryProfileV1` is included in the result for audit.
It contains only bounded identifiers, allowlisted evidence, architecture
booleans, and environment-variable names. If there is no project, run the
returned explicit `wathba project create` command with a stable idempotency key,
then repeat recommendation with `--project <projectId>`. Recommendation itself
never enables a service or creates a project.

Through MCP, `recommend_services_for_repository` uses the same profile and
policy. MCP `create_project` is the only project-creation mutation and requires
separately approved `projects:create`; never request it when a project already
exists.

## 3. Read project and service facts

Call `list_projects`, select the exact project ID, then call
`get_project_setup` and `list_project_services`. Configured services are in
`configuredServices`; services the member can still add are in
`availableServices`, each with `canEnable`, `blockers`, and the portal URL where
the member enables it. For a selected service, call
`get_service_integration_docs`, `get_service_operations`, and
`get_service_troubleshooting` as needed.

Treat returned service, skill, operation, cost, limit, and environment pins as
authoritative. Missing, ambiguous, mismatched, or unknown facts fail closed.

For Authentica reseller, require `messaging.otp.authentica` and its exact project
and Live environment binding (Authentica is Live-only). Follow [the Authentica integration boundary](authentica.md).
Do not infer enablement from historical Authenta or managed OTP. Authentica has
no test mode: every API send is a real, charged message, so no environment
label is permission for a free test or a real message. The five free live tests
per project run only from the member's own portal session.

## 4. Resolve the exact integration bundle

```sh
wathba integrate inspect --project-dir . --json --no-input
wathba integrate <capabilityCode> --project-dir . --project <projectId> --environment <environmentId> --service <serviceCode> --json --no-input
```

Pass the exact `serviceCode` from the discovered service pin; without
`--service` the CLI falls back to its built-in default service, and it selects
the bundle contract version from the service. Inspection does not upload or modify repository content. It recognizes
TypeScript, JavaScript, Python, Java, Go, PHP, .NET, cURL-oriented, and unknown
projects. `integrate` checks the exact project/environment/service/capability
pins, signed artifacts, readiness, recipe, and verification profile, then
installs the exact trusted skill by default. It never patches application code
or calls a runtime operation.

## 5. Implement and verify

Patch the member application with its normal coding tools. Keep Wathba calls in
trusted server-side code. Inspect the pinned runtime projection with `wathba
capability operations`, then validate local JSON without uploading it:

```sh
wathba capability validate <capabilityCode> --operation <operationId> --request request.json --project <projectId> --environment <environmentId> --service <serviceCode> --json --no-input
wathba capability verify <capabilityCode> --mode contract --idempotency-key <stable-key> --project <projectId> --environment <environmentId> --service <serviceCode> --json --no-input
```

Contract verification has no provider effect. Sandbox mode performs one
governed real-sandbox probe and requires `--accept-provider-effect`.

MCP itself can be tested safely by connecting MCP Inspector in Modern
(`2026-07-28`) mode and listing all nine base tools. Every base tool except
`create_project` is read-only. Test `create_project` only in an approved no-project sandbox
journey with a stable idempotency key. Unknown or under-scoped mutations must
fail.

## 6. Hand off to the member

Report:

- which project, environment, service, skill pin, and operation contract were
  used;
- which local tests passed;
- what the member must do in the portal;
- the current notices for every authorized project from a fresh
  `wathba notices list` (or `list_notices`), including whether the check was
  complete.

The member creates the production environment, completes production approval,
creates the one-time key, stores it directly in the trusted server secret
store, and deploys. Do not ask the member to reveal the key.

Legacy `.wathba` journal or `READY` files are ignored. The CLI does not track
integration progress or certify production readiness.
