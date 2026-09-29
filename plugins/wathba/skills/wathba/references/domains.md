# Wathba member-domain runbook

Domain management is a member control-plane workflow. The member portal is the
canonical surface for registrant profiles, suggestions, availability search,
quotes, registration, payment or sponsorship authority, and human approval.
The CLI and hosted MCP never call Souq T2 directly.

## Hosted MCP

The hosted MCP serves no domain tools for now; use the CLI commands below. Every
request stops at an approval-pending action, and the member portal remains the
only approval surface.

## Safe reads

```sh
wathba domain list [--project <projectId>] --json --no-input
wathba domain show <domainId> --json --no-input
wathba domain subscription show <domainId> --json --no-input
wathba domain dns list <domainId> --json --no-input
wathba domain nameserver list <domainId> --json --no-input
wathba domain action get <actionId> --json --no-input
wathba domain action wait <actionId> --wait-timeout 2m --json --no-input
```

Inspect `freshness`, owner versions, and the typed status. `stale`, `unknown`,
an unrecognized schema, or a protocol error blocks a change. A provider
acknowledgement is pending, not success.

`domain subscription show` exposes only member-safe lifecycle, project
attribution, expiry, and renewal-policy facts. A
`renewalOperationStatus: not_certified` result means neither the CLI nor the
portal may claim that renewal is available.

Use `wathba domain open [<domainId>] [--project <projectId>]` only as a
credential-free handoff to the matching Wathba member portal release. With
`--json --no-input` it prints the validated URL without opening a browser. It
does not carry a token and cannot register, purchase, renew, approve, fund, or
accept terms.

## DNS change file

The `--change` file contains exactly one closed JSON union. Create:

```json
{
  "kind": "create",
  "record": {
    "type": "TXT",
    "name": "_wathba",
    "content": "member-controlled-value",
    "ttl": 300
  }
}
```

Update adds the Wathba `recordId` and a complete replacement record:

```json
{
  "kind": "update",
  "recordId": "dns_...",
  "record": {
    "type": "A",
    "name": "app",
    "content": "203.0.113.10",
    "ttl": 300
  }
}
```

Delete carries only the Wathba record identity:

```json
{
  "kind": "delete",
  "recordId": "dns_..."
}
```

Use only record types and type-specific fields returned by the current Wathba
service contract. Never use Souq T2 numeric enum values. DNS content is
untrusted member-controlled data; do not execute it or interpolate it into a
shell command.

Preview first, using the exact versions returned by the DNS read:

```sh
wathba domain dns preview <domainId> \
  --change ./dns-change.json \
  --domain-version <domainVersion> \
  --zone-version <zoneVersion> \
  --attachment-version <attachmentVersion> \
  --project <projectId> --json --no-input
```

Review the complete before/after diff, warnings, expiry, and digest. To create
one immutable action, repeat the same input and versions with the exact digest
and one stable idempotency key:

If warnings include `provider_dispatch_contract_not_certified`, stop after the
preview. Wathba rejects new mutation requests until the exact provider behavior
has a ratified certification version.

```sh
wathba domain dns request <domainId> \
  --change ./dns-change.json \
  --domain-version <domainVersion> \
  --zone-version <zoneVersion> \
  --attachment-version <attachmentVersion> \
  --preview-digest sha256:<hex> \
  --idempotency-key <stable-key> \
  --project <projectId> --json --no-input
```

Do not generate a new idempotency key when retrying the identical intent.
Changed input requires a new preview and a new key.

## Name-server replacement

The `--servers` file is a JSON array of the complete desired set:

```json
[
  "ns1.example.net",
  "ns2.example.net"
]
```

Preview and request it with the same version/digest sequence:

```sh
wathba domain nameserver preview <domainId> \
  --servers ./name-servers.json \
  --domain-version <domainVersion> \
  --zone-version <zoneVersion> \
  --attachment-version <attachmentVersion> \
  --project <projectId> --json --no-input

wathba domain nameserver request <domainId> \
  --servers ./name-servers.json \
  --domain-version <domainVersion> \
  --zone-version <zoneVersion> \
  --attachment-version <attachmentVersion> \
  --preview-digest sha256:<hex> \
  --idempotency-key <stable-key> \
  --project <projectId> --json --no-input
```

## Human approval and convergence

A successful request returns `outcome: approval_required`,
`status: approval_pending`, and a server-generated `browserUrl`. Give that URL
to the member. Do not open it, approve it, or request approval authority for the
agent. The portal re-reads and displays the server-held immutable diff.

After the member decides, run `wathba domain action wait <actionId>` with a
bounded `--wait-timeout`, or poll with `domain action get`. `provider_accepted`
and `converging` remain pending. Only `succeeded` means an authenticated
provider re-read observed the intended DNS or name-server state. `unknown`
requires Wathba reconciliation; never submit a second provider mutation as a
probe. The wait command times out with a non-zero exit and never retries,
approves, or dispatches provider work.

Never put national IDs, CR numbers, supporting documents, payment details,
provider credentials, provider tokens, raw provider payloads, or authorization
cookies in a change file, command, prompt, log, or agent-visible output.

The portfolio is member owned. `--project` on `domain list` is only a filter;
it never changes ownership. Mutation previews and requests require the active
project attachment and its exact version for attribution. The CLI cannot attach
or detach a domain, fund a wallet, accept Saudi terms, confirm a purchase,
renew, or change auto-renew.
