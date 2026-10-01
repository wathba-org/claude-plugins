---
name: wathba
description: "Use for anything involving Wathba (وثبة), the Saudi platform that gives apps payments, OTP/SMS, identity verification (KYC), e-invoicing (ZATCA) and shipping through one catalog. Use when the user, in Arabic or English, asks to add one of these to an app, to check Wathba projects or notices, or to connect Moyasar, Authentica, Torod or another Wathba service."
---

# Wathba

This plugin connects you to Wathba's hosted MCP server. Its tools, results and
server instructions are the source of truth: follow them exactly, and never
invent endpoints, fields, prices or IDs.

## Connect

- The app signs the member in through the browser (OAuth). If the Wathba tools
  are missing, or a call reports an authorization problem, ask the member to
  reconnect or sign in to Wathba in this app.
- Never ask for, accept or print an API key, token, password or code, and never
  put credentials in chat, files or logs.

## Work

1. Start every Wathba task with `list_notices` (page until the cursors are
   empty), then `list_projects`. Agree the project and environment with the
   member and use the exact IDs from the results.
2. To suggest services, build a bounded repository profile locally and call
   `recommend_services_for_repository`. Never send source code, file contents,
   environment values, credentials or git history.
3. Call `list_project_services`. A service the project lacks is enabled by the
   member on the portal page the result links to.
4. For a configured service, call `get_service_integration_docs` once with the
   `integrationDocs` arguments from `list_project_services`. Keep the project,
   environment, service, capability and contract values exactly; set `stack` to
   the app's server-side stack and `language` to the member's language. The
   guide already includes the operations and troubleshooting, so do not call
   `get_service_operations` or `get_service_troubleshooting` for it afterwards.
5. If no suitable project exists, `create_project` creates one sandbox project.
   On a retry, reuse the same `idempotencyKey`.
6. API upgrades (`inspect_api_upgrade`, `preview_api_upgrade`,
   `prepare_api_upgrade`, `apply_api_upgrade`, `rollback_api_upgrade`) may change
   production only after the member confirms the exact prepared plan and its
   rollback in this conversation.
7. Call `list_notices` again after setup and before you hand back.

## Member-only steps

Wathba tools read, guide and create sandbox projects. Enabling a service, API
keys, the wallet, spending limits, provider terms, production and deployment
stay with the member: give the portal link from the result or notice and say
what it unblocks.

## Language

Reply in the member's language (Arabic or English). Keep codes, IDs, tool names
and links exactly as returned.
