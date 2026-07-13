---
name: wathba
description: "Install and operate the Wathba (وثبة) CLI — the agent-first command line for the Wathba developer platform — to authenticate, create projects, set up/activate services (OTP messaging, payments checkout, logistics shipping, ...), integrate capabilities into a member app, manage API keys, and verify results. Use this skill whenever the user mentions Wathba, وثبة, wathba-cli, install.wathba.info, api.wathba.info, a Wathba service/capability code, or asks — in English OR Arabic — to install the CLI, login, «فعّل خدمة», «ركّب wathba», «اربط الدفع», «سوّي مشروع», set up payments/OTP/shipping on Wathba, integrate a capability, rotate keys, or check why a Wathba setup is stuck. Trigger even if the user doesn't say 'CLI' — any request to provision or manage Wathba platform capabilities goes through this skill. Prompts may arrive in Arabic, English, or a mix (Arabizi); understand them, do the job with the wathba CLI, and reply in the user's language."
---

# Wathba CLI

`wathba` is an **agent-first** CLI (Go binary) for installing, authenticating, configuring, and verifying capabilities on the Wathba platform (`https://api.wathba.info`). It is designed to be driven by AI agents: deterministic JSON output, typed outcomes, machine-readable manifest, and resumable workflows.

## Language handling (Arabic / English)

The CLI itself speaks English, but users speak to YOU in Arabic, English, or a mix. Your job:

1. **Understand the request in either language** and map it to wathba commands. Common Arabic phrasings:
   - "ركّب / نزّل / ثبّت wathba" → install the CLI
   - "سجّل دخول / وثّق" → `wathba login --device`
   - "سوّي / أنشئ مشروع" → `wathba project create`
   - "فعّل خدمة X" / "شغّل X" → service setup → activate flow
   - "اربط / أضف الدفع (المدفوعات) لتطبيقي" → `wathba integrate <payments-capability>`
   - "وش صار / وين وصلنا / تحقق" → `status` / `verify` commands
   - "احذف / عطّل / شِل الخدمة" → deactivate/remove flow
   - "المفاتيح" → `wathba key ...`
2. **Finish the job**, not just translate it — run the full command sequence to the real outcome.
3. **Reply in the language the user used** (Arabic request → Arabic answer, with command names/codes kept in Latin script). Mixed input → mirror the dominant language.

## Installation

Native installer scripts only (no Homebrew/npm/GitHub Releases):

```sh
# macOS / Linux
curl -fsSL https://install.wathba.info/install.sh | bash
# Windows PowerShell
irm https://install.wathba.info/install.ps1 | iex
```

- Installs the binary to `$HOME/.wathba/bin` (override: `WATHBA_INSTALL_DIR`) and this skill plus the signed `wathba-integration` bootstrap skill into agent skill directories (`$HOME/.agents/skills`, `$HOME/.claude/skills`; overrides: `WATHBA_CODEX_SKILLS_DIR`, `WATHBA_CLAUDE_SKILLS_DIR`).
- Pin channel/version: `WATHBA_CHANNEL=beta` or `WATHBA_VERSION=v1.4.0` as env vars on the pipe.
- Requires `curl` + `openssl`; the installer verifies signatures with a pinned Cosign — never bypass verification.
- **Scripting the installer:** set `WATHBA_INSTALL_OUTPUT=json` to get NDJSON events (`schema_version: wathba.installer.event.v1`); consume the FINAL event and check `outcome` (`installed | updated | already_installed`, or `failed` + `error.code`). Don't parse human text.
- After install, ensure `$HOME/.wathba/bin` is on `PATH`, then verify: `wathba version` and `wathba doctor`.
- Note: if the environment blocks `curl` in your shell, run the installer via whatever sandboxed-exec tool you have; the contract above is unchanged.

## The three rules that keep agents correct

1. **Always pass `--json` (and usually `--no-input`).** Success envelope: `{"schema_version":"wathba.output.v1","ok":true,"data":{...}}`; failure: `{"schema_version":"wathba.error.v1","ok":false,"error":{"code","message","hint","details"}}`. Data → stdout, logs → stderr.
2. **Exit code 0 does NOT mean done.** Inspect `data.outcome`. Typed outcomes: `ACTIVE`, `SETUP_NOT_REQUIRED`, `READY_TO_ACTIVATE`, `ACTION_REQUIRED`, `PENDING`, `BLOCKED`, `DEACTIVATION_PENDING`, `REMOVED` — plus `data.canActivate`. Only report success to the user when the outcome says so.
3. **Know the exit codes:** 0 success (still check outcome) · 1 general · 2 invalid input/missing context · 3 not authenticated → login · 4 permission denied · 5 not found · 6 network · 7 timeout · 8 conflict/replay (journal advanced elsewhere — re-read status, don't retry blindly) · 9 verification failed · 10 update failed · 11 protocol incompatible.

## Core workflows

**First-time onboarding:**
```sh
wathba login --device --wait --json        # OAuth device flow; tokens go to OS keychain
wathba auth status --json
wathba project create --name "my-app" --json
wathba project select <projectId> --json   # persists default project/environment
```

**Activate a service** (e.g. OTP messaging):
```sh
wathba service setup <serviceCode> --json
# outcome SETUP_NOT_REQUIRED → activate directly; otherwise:
wathba service wait <serviceCode> --until ready --json
wathba service activate <serviceCode> --json
wathba service status <serviceCode> --json   # confirm outcome ACTIVE
```

**Integrate a capability into the user's app** (writes code + credentials into the project):
```sh
wathba integrate <capabilityCode> --project-dir . --json --no-input
# stops with typed ACTION_REQUIRED / PENDING / BLOCKED and prints the exact resume command
wathba integrate resume <capabilityCode> --json --no-input
wathba integrate verify <capabilityCode> --json
```
`integrate` requires a **keychain device session** — it rejects `--token`/`WATHBA_TOKEN`. With `--no-input` it never opens a browser. State lives in a journal (user config dir) + `.wathba/integration.lock` in the project; exit 8 means another process advanced it — run `integrate status` and continue from reality. Also: `integrate repair|upgrade|rollback|remove <cap>`.

**Discover what exists / self-describe:** `wathba manifest --json` (full machine-readable command+schema contract), `wathba schema list`, `wathba api operations`, `wathba service list --json`, `wathba capability verify <code> --json`.

**Keys:** `wathba key create|list|rotate|revoke|suspend|reactivate ...` — see reference.

## When things go wrong

- Exit 3 → `wathba login --device --wait --json`, then retry.
- Stuck/unknown state → `wathba doctor --json`, then the relevant `status` command; trust the journal, not your memory.
- `BLOCKED`/`ACTION_REQUIRED` → the JSON `hint` and printed resume command tell you the exact next step; if it needs a human (browser approval, dashboard action), tell the user precisely what to do — in their language — then run `resume`.
- Never invent flags: confirm with `wathba manifest --json` or `wathba <cmd> --help`.
- `wathba feedback` is human-only (real TTY, refuses `--no-input`) — never call it as an agent; ask the user to run it.

## References

- `references/commands.md` — full command surface: every command, subcommand, and flag, plus env vars and config precedence. Read when you need a flag you don't see above.
- `references/workflows.md` — detailed end-to-end sequences (service lifecycle, capability integration, deactivation, key rotation, self-update), journal/locking semantics, and outcome state machine.
- `references/arabic-glossary.md` — Arabic↔English phrase→command mapping and response-style guide for replying in Arabic. Read when handling an Arabic or mixed-language request.
