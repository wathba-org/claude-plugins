# Payments capability runbook

Applies when the live service inventory contains the Moyasar-backed payment
service and a Wathba operator has enabled it for the selected project. The
member application talks only to Wathba with its project API key. The agent and
the member app never hold or see a Moyasar credential.

## 1. Checkout request contract

The trusted member server creates a hosted checkout link with a normalized
Wathba request. The authoritative field shapes are the shipped public OpenAPI
specification (`openapi/wathba-public.openapi.json` in the platform, consumed
by the official TypeScript SDK); do not restate or guess fields beyond it.
Key camelCase fields:

- `amountMinor` — positive integer in the currency's smallest unit,
  minimum 100.
- `currency` — ISO 4217 three-letter code such as `SAR`.
- `description` — shown to the payer on the hosted page.
- `environmentId` — the backend-assigned environment, never a guessed value.
- `successRedirectUrl` / `failureRedirectUrl` — member return URLs.
- `metadata` — non-sensitive correlation strings only (for example an order
  ID); never credentials, card data, or provider payloads.

The member never sends a provider key, provider endpoint or object ID,
`source`/`splits`, card data, or a provider callback URL.

## 2. Idempotency

Every state-changing call — create link or product, refund, and similar —
requires an `Idempotency-Key` header with a member-generated unique key.

- Retry after a timeout, connection error, or 5xx with the exact same key and
  the same request body.
- Never generate a new key to retry; that can create a second payment or
  refund.
- The same key with a different body is rejected.

## 3. Response and status confirmation

A successful create returns a Wathba `linkId` and a hosted-checkout
`publicUrl`. Hand `publicUrl` to the payer; store `linkId` for correlation.

Never mark a payment successful from the success redirect or return URL alone.
Confirm by fetching the payment status through Wathba, polling the same Wathba
payment/execution ID. Statuses such as `created` and `provider_pending` are
pending: keep polling the same ID. Report success only on a terminal paid
status from the authoritative fetch. Never issue a duplicate checkout or
payment as a probe.

## 4. Refunds

Request a refund through the normalized Wathba refund operation with its own
`Idempotency-Key`, then poll the refund status the same way as payments: the
request is accepted asynchronously and the provider result arrives later. A
pending refund stays pending until the fetched status is terminal.

## 5. Test versus production mode

`environmentId` selects test or production mode. The member configures the test
key directly in the application's trusted test secret store, then the
application creates a test checkout and confirms the fetched status. Only after
that, the member switches the deployed server to the production environment
key. Never mix environment IDs and keys.

## 6. Never expose

Beyond the core safety rules, for payments specifically never ask for, print,
store, or forward:

- Moyasar API keys or Moyasar invoice/payment/token IDs;
- webhook shared secrets;
- raw provider request or response payloads;
- PAN, CVC, or any card data.

Only the trusted member app holds the Wathba project API key. The agent sees
only safe metadata via `wathba key list`.

## 7. Verify

Use the repository's own tests with a mocked Wathba transport, then let the
member run a controlled test-environment checkout from the trusted application.
Confirm its status through the same application flow. Do not charge a real
card, touch production, or ask to see the key. Report concrete test evidence;
the CLI does not certify a `READY` state.
