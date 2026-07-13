# Wathba CLI — End-to-End Workflows

Always run commands with `--json` (and `--no-input` unless you specifically want a browser handoff). After every command: check the exit code, then parse the envelope, then branch on `data.outcome`. Exit 0 alone proves nothing.

## Outcome state machine

```
SETUP_NOT_REQUIRED ──────────────► activate ─► ACTIVE
setup ─► PENDING ─► READY_TO_ACTIVATE ─► activate ─► ACTIVE
   │        │
   │        ├─► ACTION_REQUIRED  (human/browser/dashboard step; JSON hint + printed resume command)
   │        └─► BLOCKED          (precondition failed; hint says what)
deactivate ─► DEACTIVATION_PENDING ─► wait --until removed ─► REMOVED
```

Also check `data.canActivate` before calling `activate`.

## 0. Fresh machine → working CLI

```sh
curl -fsSL https://install.wathba.info/install.sh | bash
export PATH="$HOME/.wathba/bin:$PATH"       # persist in the user's shell profile
wathba version --json
wathba doctor --json                         # all checks should pass
```
Scripted install: `WATHBA_INSTALL_OUTPUT=json` and read the final NDJSON event's `outcome`.

## 1. Onboarding (auth + project)

```sh
wathba login --device --wait --json     # prints verification URL + user code; --wait blocks until approved
wathba auth status --json               # confirm session
wathba project create --name "my-app" --json
wathba project select <projectId> --json
```
- Tokens live in the OS keychain only. `--no-input` + login: the device flow still needs the user to visit the URL — surface the URL and code to the user (in their language), then `wathba auth complete` / re-check `auth status`.
- Exit 3 anywhere later → session expired → `auth refresh`, else `login --device` again.

## 2. Service lifecycle (platform-side on/off)

```sh
wathba service list --json                       # find serviceCode
wathba service setup <svc> --json
```
Branch on outcome:
- `SETUP_NOT_REQUIRED` → `wathba service activate <svc> --json` directly.
- `PENDING` → `wathba service wait <svc> --until ready --json` (blocks; respects `--timeout`), or poll `service status`.
- `ACTION_REQUIRED` → `wathba service open <svc> --json` gives a channel-validated dashboard URL; hand it to the user, then re-check `status`.
- `READY_TO_ACTIVATE` / `canActivate: true` → `wathba service activate <svc> --json`.
Finish: `wathba service status <svc> --json` must show `ACTIVE` before you tell the user it's done.

Deactivation: `service deactivate` → outcome `DEACTIVATION_PENDING` → `service wait <svc> --until removed --json` → `REMOVED`.

## 3. Capability integration (writes into the user's app)

Precondition: keychain device session (`integrate` rejects `--token`/`WATHBA_TOKEN`), and run from (or `--project-dir`) the app repo.

```sh
wathba integrate <capabilityCode> --project-dir . --credential-destination local_mock --json --no-input
```
Internally: local preflight/pins → setup start/status → guarded activation → owner actions → signed skill install + member-app patch → verification. It stops at typed pause points:
- `ACTION_REQUIRED` / `PENDING` / `BLOCKED` → the output includes the exact resume command (with `--no-input` it never opens a browser). Do the described step (or ask the user to), then:
```sh
wathba integrate resume <capabilityCode> --json --no-input
```
Repeat resume until terminal. Then verify:
```sh
wathba integrate verify <capabilityCode> --json    # exit 9 = verification failed → integrate repair
wathba capability verify <capabilityCode> --json
```
Maintenance: `integrate upgrade` (may need `--acknowledge-migration-digest`), `integrate rollback`, `integrate remove`.

For real credentials instead of mocks, set `--credential-destination` (+ `--credential-destination-id`) per the capability's docs.

## 4. Journal & locking semantics

- Integration state: `$(UserConfigDir)/wathba/integrations` (schema `wathba.integration-journal.v1`/`.v2`). Service onboarding state: `$(UserConfigDir)/wathba/service-onboarding`. Project projection: `.wathba/integration.lock` (commit-worthy).
- Exit 8 (`CONFLICT_OR_REPLAY_MISMATCH`) = another process advanced the journal. Do NOT retry the same command blindly — run `integrate status <cap> --json` (or `service status`) and continue from the reported state.
- Use `--idempotency-key` on mutations you might have to retry (network flakes).

## 5. API keys

```sh
wathba key create --environment <env> --json     # or --env test for a test key
wathba key list --json
wathba key rotate <keyId> --overlap-seconds 300 --json   # overlap keeps old key valid during cutover
wathba key activation complete <keyId> --json
```
Incident response: `key suspend` (temporary) · `key revoke` (permanent) · `key compromise <keyId>` (report + kill) · `key reactivate` (undo suspend). Secret material appears once in create/reissue output — deliver it to the user immediately; it is never stored by the CLI.

## 6. Self-update

```sh
wathba update check --json
wathba self-update --json                    # stable channel
wathba self-update --channel beta --json
wathba self-update --verify-only --json      # verify current install
wathba self-update --rollback --json         # after a bad update (exit 10)
```

## 7. Raw API escape hatch

When no dedicated command exists:
```sh
wathba api operations --json
wathba schema get <operationId> --json       # learn the input shape
wathba api call <operationId> --input payload.json --json
```

## Reporting back to the user

Summarize: what was requested → commands run → final `outcome` per service/capability → anything still pending and exactly what the user must do next. In the user's language (see `arabic-glossary.md` for Arabic responses). Never claim ACTIVE/installed without having seen it in JSON output.
