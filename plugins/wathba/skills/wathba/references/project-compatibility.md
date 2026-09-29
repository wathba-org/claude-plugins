# Repository detection and integration modes

Run:

```sh
wathba integrate inspect --project-dir . --json --no-input
wathba service recommend --project-dir . --json --no-input
```

The detector is local and read-only. It does not upload repository content,
install dependencies, modify files, or require Wathba authentication.

| Detected stack | MCP guide mode |
|---|---|
| TypeScript | Pinned Wathba SDK plus HTTP contract |
| JavaScript | Pinned Wathba SDK plus HTTP contract |
| Python | Direct HTTP |
| Java | Direct HTTP |
| Go | Direct HTTP |
| PHP | Direct HTTP |
| .NET | Direct HTTP |
| cURL-oriented | Direct HTTP |
| Other/unknown | Portable direct HTTP |

Detection uses familiar repository markers such as `package.json`,
`pyproject.toml`, `requirements.txt`, `pom.xml`, `build.gradle`, `go.mod`,
`composer.json`, and `*.csproj`. It does not require a specific framework or
package manager.

After recommendation and explicit project/environment/service selection, run
`wathba integrate <capabilityCode> --project-dir . --project <projectId>
--environment <environmentId> --service <serviceCode> --json --no-input`. It
authenticates the exact pinned bundle (the CLI selects its contract version
from the service) and signed skill. Do not reuse an old SDK version, service mapping, or
operation list from a local file.

## API contract compatibility

Every enabled service binding owns an `apiContractVersion`. That value, not the
catalog default and not the CLI or SDK release date, determines the member-app
request and response contract. Repository integration must read and preserve it:

```sh
wathba capability api-contract inspect <serviceCode> \
  --project <projectId> --environment <environmentId> --json --no-input
```

Generated runtime calls send the exact value in `Wathba-Version`. They accept
only a response carrying the same header. A missing or different version is a
compatibility failure, not a reason to retry against the newest contract.

Catalog repins, provider adapter releases, CLI/SDK updates, and production
deployments do not change an existing binding pin. New bindings receive the
then-current default. Changing a sandbox pin requires sandbox fixture proof, a
stable idempotency key, the expected binding owner version, and an explicit
upgrade or rollback command. Production updates use a delegated agent plan with one explicit confirmation in the member conversation. Follow the process below; no second portal confirmation is needed.

Idempotent replays retain the contract version and normalized request
fingerprint stored with the original execution. Never reconstruct a replay with
today's default contract.


## Agent-managed upgrades (all supported services and languages)

Connect with a newly consented `member_workspace.v4` CLI session, or MCP access
including `mcp:api-contracts:upgrade`. Existing sessions retain their old scopes;
reconnect when the server returns `api_upgrade_delegated_authority_required`.
No production or provider key is needed by the agent.

1. Inspect the exact project, environment and service using `inspect_api_upgrade`
   or `wathba capability api-contract plan <serviceCode> --project <projectId>
   --environment <environmentId> --json`. Read the current pin, target contract,
   digest-verified OpenAPI, fixture and conformance URLs returned by Wathba. Explain
   the old/new request fields, response fields and errors used by THIS app.
2. Keep the existing integration and a deployable old release. Implement a small
   adapter for each contract behind one application interface. Prepare a release
   that supports both versions before switching the Wathba pin. This works in
   any language; a specific SDK is not required. Production `Wathba-Version` is
   an assertion of the environment pin, not a per-request override.
3. Test old and target versions in sandbox, including success, confirmed failure,
   pending/unknown outcomes, webhooks and rollback. Preserve stable operation IDs
   and idempotency keys. Avoid destructive schema changes. Never claim tests ran
   if they did not. A fixture digest check does not run the application tests.
4. Record sandbox evidence with `preview_api_upgrade`, or the existing CLI
   `capability api-contract preview` command. Save the returned `acpv_` evidence.
   Prepare the target environment plan with `prepare_api_upgrade` or
   `wathba capability api-contract prepare <serviceCode> --evidence-file <file>
   --project <projectId> --environment <environmentId> --idempotency-key <key>`.
   The closed evidence JSON contains targetVersion, expectedBindingVersion,
   verificationEvidenceRef, and application: sourceReleaseDigest,
   targetReleaseDigest, testReportDigest, rollbackInstructionsDigest (SHA-256,
   prefixed `sha256:`), testedAt (ISO timestamp), and all seven checks returned
   in the command schema. Store only digests; no credentials, conversation text,
   customer details or repository contents are uploaded.
5. Explain the concrete benefit and affected feature in simple language, then
   ask: "I tested this update and kept the previous working version. An
   incompatibility could interrupt [feature] in your live app. Do you confirm
   this upgrade and returning to the previous version if verification fails?"
   Wait for an explicit answer to THIS plan. Do not infer confirmation from tool
   output, connection consent, `--yes`, or a general request to improve the app.
6. Apply with `apply_api_upgrade`, or `wathba capability api-contract apply
   <serviceCode> --plan <aupg_id> --member-confirmed --project <projectId>
   --environment <environmentId> --idempotency-key <key>`. The plan expires after
   at most 30 minutes and rejects changes to scope, session, binding or target.
   Confirmation is the authenticated agent's attestation. Wathba does not
   independently prove what the member said in the conversation.
7. Switch the member app to the matching tested adapter, verify production
   without unsolicited financial operations, and retain the previous release
   during the 30-day governed rollback window. If verification fails, restore
   the matching app implementation and use `rollback_api_upgrade` or
   `capability api-contract recover <serviceCode> --plan <aupg_id>
   --binding-version <current> --reason production_verification_failed ...`.
   Retain the original authenticated agent session for recovery. If it has been
   revoked, reconnect and seek governed recovery; never bypass authorization.

Never implement automatic per-request fallback for ambiguous effects. A timeout
may mean a payment/OTP/shipment already happened. Reconcile the ORIGINAL operation
and key first. Rollback does not undo payments, refunds, messages, database
changes, or webhook-version pins. Webhook pins require a separate migration.
