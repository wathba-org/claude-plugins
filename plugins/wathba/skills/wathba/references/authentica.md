# Authentica reseller integration boundary

Use this with the selected service's live, pinned integration guidance. It does
not advertise availability, publish a recipe, or authorize a provider request.

## Select the exact service and project

The three OTP identities are distinct:

| Service | Meaning |
| --- | --- |
| `messaging.otp.wathba` | Managed OTP; the default `messaging.otp` selection. |
| `messaging.otp.authenta` | Historical member-level Authenta integration. |
| `messaging.otp.authentica` | New reseller application linked to one member, project, and environment. |

Read `list_project_services` and `get_project_setup`, then the selected service's
`get_service_integration_docs`, `get_service_operations`, and
`get_service_troubleshooting`. Use the installed CLI manifest for corresponding
CLI commands. If discovery cannot select this exact service and scope, report
the blocker; do not switch providers or reuse another project's application.

The member enables and configures the service in the selected project's portal:
application name, default channel, optional distinct fallback, and code validity.
Authentica is Live-only: setup happens in the project's Live (`production`)
environment, and the portal creates Live first when the project has none.
Application creation must link to that project and its Live environment. If the
portal shows "Retry setup", the member can resume a setup that stopped; it never
creates a second application. Settings and
templates remain governed by current server capabilities; do not invent provider
features, sender registration, template sharing controls, or WhatsApp templates.
`service status` and `service wait` read the exact project/environment binding.
An active binding returns `ENABLED` with `runtimeReadiness: unchecked`. Other
known states require project-portal action; missing or mismatched responses
fail closed. Status never sends a message, allocates funds or activates a
provider application. Continue to require current runtime gates and the exact
published integration bundle before using the service.

## Patch the member application's server

Install only the trusted, compatible integration bundle and recipe selected for
the exact service, project, and environment. Through the CLI that is `wathba
integrate messaging.otp --project-dir . --project <projectId> --environment
<liveEnvironmentId> --service messaging.otp.authentica --json --no-input`; the
CLI then selects contract version 4. Without `--service` it falls back to
managed `messaging.otp.wathba`, which is the wrong service. Use its published SDK version or
HTTP contract. A source branch, example, or unreleased SDK is not a release pin.

The finished runtime path is **member app → Wathba → Authentica**. Keep Wathba
API credentials in the member application's server secret store. Provider and
reseller master keys stay inside Wathba; never request them. An AI coding agent
helps integrate and verify the app; it does not become its runtime caller.

The runtime flow in the reseller contract is:

1. Send a code through Wathba with the selected channel, recipient, stable
   idempotency key, and a maximum cost in SAR from the member-approved policy.
2. Preserve the returned send execution ID. An accepted request does not prove
   message delivery. A pending response remains pending.
3. Verify the transient code against that original send execution in the same
   project and environment. Never change its recipient or application.
4. Grant application access only after the published response explicitly confirms
   verification. An HTTP response, accepted send, timeout, or pending check is
   not authentication success.
5. Poll the published read-only execution-status operation for uncertain results.
   Do not automatically resend, repeat a verification check, or rotate the
   idempotency key to bypass pending state.

Never log codes, full recipients, credentials, or raw provider responses. Preserve
safe execution IDs and controlled statuses for troubleshooting.

## Explain cost and test boundaries

The member pays from the existing shared Wathba Wallet. Present prices and cost
limits in SAR using current published channel tariffs; never display provider
points or infer a flat price for all channels. Preserve exact amounts rather
than rounding each request to whole halalas.

Charge on an accepted send, even if the user never verifies. Verification does
not create another charge. Unknown send outcomes retain their reservation until
authoritatively resolved. A definite rejection must not become an accepted-send
charge. Unsupported or unpriced channels and paid fallback stay unavailable
until the live contract allows them.

Authentica has no test mode, so Wathba offers it only in a project's Live
environment. New Test setups are refused with `authentica_live_only`; use the
Live environment ID and a Live API key. Contract checks must stay effect-free.
Live acceptance requires an explicitly authorized recipient/channel, bounded
spend, current readiness, and the published approval path. Do not assume a legacy
`--mode sandbox` command supports paid-live Authentica verification.

Each project gets five free live tests. The member runs them from the portal's
"Run a live test" sheet and Wathba pays for them; an API or CLI send is always
charged to the Wallet. No operator step or spending policy is needed to send:
the Wallet balance and each request's `maxCostSar` bound the spend, and an
operator-set spending policy, when one exists, still applies.

## Report evidence precisely

Distinguish local contract tests, installed artifact validation, configured
project state, provider acceptance, confirmed verification, and Wallet posting.
For a live test, retain the safe original execution and ledger references and
verify that replay produces no second send or charge. Report pending outcomes
and missing release/approval/readiness facts as blockers, not completed tests.
