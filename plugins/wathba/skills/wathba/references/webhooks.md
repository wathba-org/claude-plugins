# Member webhook runbook

Applies when the member app wants Wathba to push signed event deliveries
(payments and other capability events) to a member-operated HTTPS endpoint.
Deliveries are a hint, never the source of truth: always confirm state with an
authoritative fetch through Wathba.

## 1. Register the endpoint

```sh
wathba webhook register https://<member-host>/hooks/wathba \
  --project <projectId> --environment <environmentId> \
  --idempotency-key <key> --json --no-input
```

Only HTTPS member URLs are accepted; the platform rejects private, internal,
or otherwise unsafe destinations. The response returns the endpoint summary
(`endpointId`, `state`, `verificationStatus`, `urlHash` — never the raw URL)
and a one-time `verificationChallenge`. Complete verification with:

```sh
wathba webhook verify <endpointId> <challenge> --idempotency-key <key> --json
```

The endpoint signing secret (`whsec_...`) is never revealed through the CLI;
output always redacts it. The authorized human retrieves signing material in
the trusted member portal and places it in the member server's secret store.
The agent never asks for, prints, stores, or forwards it.

Inspect and contain endpoints with:

```sh
wathba webhook list --project <projectId> --json
wathba webhook disable <endpointId> --idempotency-key <key> --json
```

## 2. Confirm portal configuration

The member reviews and approves any required webhook configuration in the
Wathba portal. MCP may describe the requirement but cannot create the endpoint,
approve readiness, or receive signing material.

## 3. Verify every delivery signature

Each delivery is an HTTPS POST with headers:

- `x-wathba-signature: v1=<64 lowercase hex>` — one signature, never a list.
- `x-wathba-signature-version` — the exact signing-secret version; no fallback.
- `x-wathba-timestamp` — unix seconds as a string.
- `x-wathba-event-id`, `x-wathba-delivery-id` — correlation IDs.

Compute HMAC-SHA256 over `timestamp + "." + rawBody` (the exact raw request
bytes, before any JSON parsing) with the raw `whsec_...` string as the key.
Compare against the header value with a constant-time comparison and reject
deliveries whose timestamp is outside a 300-second tolerance. Prefer the
official Wathba TypeScript SDK's `verifyWebhookSignature` helper once
released instead of hand-rolling this. Reject on any mismatch; never log the
secret or the raw signature inputs.

## 4. Deduplicate and process

The delivery body is a strict envelope:

- `eventId` (`evt_...`) — the deduplication key, stable across redeliveries.
- `eventType`, `alertKey`, `payloadVersion`, `payload` — member-safe fields.

Delivery is at-least-once: redeliveries and replays reuse the same `eventId`.
Persist processed `eventId`s and acknowledge duplicates without reprocessing.
Return 2xx quickly; do slow work asynchronously.

## 5. Confirm state authoritatively

Treat every webhook as a hint. On a payment event, fetch the payment status
through Wathba (see `references/payments.md`) and act only on the fetched
terminal status. Never mark a payment paid, refunded, or failed from a
webhook body alone.

## 6. Inspect deliveries

```sh
wathba webhook deliveries --project <projectId> \
  [--endpoint <endpointId>] [--state <state>] [--limit <n>] --json
```

Returns delivery status metadata only (state, attempts, response class) —
never event payloads or signing material. Use it to diagnose dead-lettered or
retrying deliveries; replay and subscription management stay in the trusted
member portal.
