# Directory listing package

Material for the public directories. Submissions happen through each
directory's own form; nothing here is secret, and reviewer credentials never go
in this repository.

| Directory | Submit | Status |
|---|---|---|
| Official MCP Registry | `server.json`, published by `release.yml` on each `v*` tag | Automated |
| Anthropic plugin directory (Claude Code) | This repository (`wathba@wathba` from the `wathba` marketplace) | Ready once the blockers below are cleared |
| Anthropic Connectors Directory (Claude web, Desktop, Cowork) | Remote MCP URL `https://api.wathba.info/mcp` | Ready once the blockers below are cleared |
| OpenAI plugin directory (ChatGPT and Codex) | The `wathba-plugin-<version>.zip` attached to the GitHub release | Ready once the blockers below are cleared |

## Blockers before any directory submission

1. Public privacy policy and terms of service pages for the plugin. Add their
   URLs to `plugin.config.json` as `publisher.privacyPolicyURL` and
   `publisher.termsOfServiceURL` (both omitted until set) and to each form. The
   support contact, juriba@wathba.sa, is already in the generated metadata.
2. A dedicated reviewer member account with a sandbox project, shared only
   through each directory's form.
3. Recorded acceptance runs for the hosts being listed (`docs/acceptance/`).

## Icons

`src/assets/wathba-icon-light.png` and `wathba-icon-dark.png`: square 512×512
PNGs (light and dark theme), used as the logo and composer icon. The generator
rejects any icon that is not a square PNG of 48 to 4096 pixels under 5 MiB.

## Listing text

**Name:** Wathba (وثبة)

**Tagline (en):** Saudi payments, OTP, KYC, ZATCA and shipping for your app.

**Tagline (ar):** المدفوعات والتحقق برمز OTP والتحقق من الهوية والفوترة الإلكترونية والشحن لتطبيقك في السعودية.

**Description (en):** Wathba gives your app Saudi payments, OTP/SMS, identity
verification (KYC), ZATCA e-invoicing and shipping through one catalog. Connect
your coding agent and it reads your Wathba projects and notices, recommends
services for your repository, follows each service's pinned integration guide,
creates sandbox projects, and updates an integration's API version after you
confirm the exact plan. You sign in through the browser; the agent never sees
an API key.

**Description (ar):** وثبة تمنح تطبيقك المدفوعات والتحقق برمز OTP والتحقق من
الهوية والفوترة الإلكترونية وفق متطلبات زاتكا والشحن عبر كتالوج واحد. اربط
وكيلك البرمجي ليقرأ مشاريعك وتنبيهاتك في وثبة، ويقترح الخدمات المناسبة
لمستودعك، ويتبع دليل التكامل المعتمد لكل خدمة، وينشئ مشاريع اختبارية، ويحدّث
إصدار API للتكامل بعد تأكيدك للخطة بدقة. تسجّل الدخول عبر المتصفح، ولا يرى
الوكيل أي مفتاح API.

**Category:** Developer tools

**Authentication:** OAuth 2.1 with PKCE (dynamic client registration and
Client ID Metadata Documents supported). Every connection is granted
`mcp:read mcp:api-contracts:upgrade projects:create`; the member approves it on
the Wathba consent page.

## What each tool does

| Tool | Reads or writes | Effect |
|---|---|---|
| `list_notices` | Read | The member's actionable notices across projects |
| `list_projects` | Read | The member's projects and environment readiness |
| `get_project_setup` | Read | Sandbox, production, portal and key-management guidance (no credentials) |
| `list_project_services` | Read | Configured and available services |
| `get_service_integration_docs` | Read | The pinned integration guide for a configured service |
| `get_service_operations` | Read | The guide's runtime operations only |
| `get_service_troubleshooting` | Read | The guide's troubleshooting only |
| `recommend_services_for_repository` | Read | Recommendations from a bounded repository profile built locally; no source code is sent |
| `create_project` | Write | Creates one sandbox project (idempotent) |
| `inspect_api_upgrade` | Read | Pinned version and supported contracts |
| `preview_api_upgrade` | Write | Records sandbox contract evidence |
| `prepare_api_upgrade` | Write | A short-lived upgrade plan bound to tested releases |
| `apply_api_upgrade` | Write | Changes the API version pin, including production, only after the member confirms the exact plan in the conversation |
| `rollback_api_upgrade` | Write | Restores the previous API version pin |

The tools never create or reveal API keys, enable services, fund or read the
wallet, accept provider terms, promote to production, deploy, or run OTP,
payment or shipping operations. Those stay with the member in the Wathba portal.

## Data handling

- Tool results carry project and integration facts only; a recursive output
  guard blocks credential-shaped values.
- `recommend_services_for_repository` accepts a bounded profile and rejects
  source code, file contents, environment values and credentials.
- OAuth tokens stay in the agent host, outside the model context.
