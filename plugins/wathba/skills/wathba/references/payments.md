# Payments capability runbook

Applies when the live service inventory contains the Moyasar-backed payment
service and a Wathba operator has enabled it for the selected project. The
member application talks only to Wathba with its project API key. The agent and
the member app never hold or see a Moyasar credential.

## Release boundary

Universal Wathba Checkout is the Catalog 017 contract, but this reference is not
an availability claim. Use it only when Wathba resolves exact signed skill
`wathba.skills.payments-checkout` version `1.0.16`, server SDK
`@wathba-cli/sdk` version `0.2.0`, and release `catrel_mvp_017`. Catalog 015 /
skill `1.0.14` retains the older provider-gateway contract. Catalog 016 / skill
`1.0.15` retains the Payment Link candidate. Never mix their operations,
recipes, or verification evidence.

## 1. Payment Intent request contract

The trusted member server creates a Payment Intent with
`payments.createIntent`, the `payments:intents:create` scope, and an
`Idempotency-Key`. The exact `createPaymentIntent` recipe is supplied by the
signed skill. Key fields include:

- `amountMinor` — positive integer in the currency's smallest unit,
  minimum 100.
- `currency` — ISO 4217 three-letter code such as `SAR`.
- `orderReference` — the member's stable order identity.
- `description` — shown to the payer on Wathba Checkout.
- `environmentId` — the backend-assigned environment, never a guessed value.
- `allowedMethods` — an upper bound; Wathba still shows only methods that are
  actually ready for the merchant, environment, device, and browser.
- `returnUrl` and exact web-origin or mobile-app binding — validated payer
  return and delivery boundaries.
- `metadata` — non-sensitive correlation strings only (for example an order
  ID); never credentials, card data, or provider payloads.

The member never sends a provider key, provider endpoint or object ID,
`source`/`splits`, card data, or a provider callback URL.

Persist the returned `paymentIntentId` against the order. Deliver only
`checkout.url` and the short-lived `checkout.token` to the payer client. Open
the Wathba page in a popup or top-level browser; on iOS use an authentication
session and on Android use a Custom Tab. Do not build another payment form. Do
not use an iframe/WebView. Do not call Moyasar from the member application.

Use `createPaymentLink` only for a URL sent by message or shown outside an app.
It opens the same universal Checkout and is not another payment engine.

## 2. Wathba-hosted Checkout boundary

The launcher transports the delivery token in the URL fragment. Wathba
exchanges it once for an HttpOnly payer session, removes the fragment, and owns
the bilingual payment UI and lifecycle. The page shows cards, Apple Pay, and
STC Pay only when their exact runtime readiness checks pass. Samsung Pay stays
hidden until its provider contract is certified.

Payment input goes directly from the Wathba page to the approved processor
boundary. Wathba receives only transient provider input and never persists card
account details or verification digits. The member application receives
neither card data nor provider tokens.

The browser-visible page initialization material is restricted to the Wathba
page-render path. It must not appear in member or agent JSON, CLI or MCP output,
logs, events, tests, or prompts. The member's `WATHBA_API_KEY` remains on its
trusted server and must never enter the payer page.

## 3. Idempotency

Every state-changing call — intent create/cancel, checkout-session rotation,
link mutation, checkout, or refund — requires an `Idempotency-Key` header with
a member-generated unique key.

- Retry after a timeout, connection error, or 5xx with the exact same key and
  the same request body.
- Never create a new intent after an ambiguous timeout.
- Never generate a new key to retry; that can create a second payment or
  refund.
- The same key with a different body is rejected.

## 4. Response and status confirmation

Never mark a payment successful from the success redirect or return URL alone.
Use `payments.getIntent` or the signed `getPaymentIntent` operation and poll the
same Wathba Payment Intent. Statuses such as `requires_payment_method`,
`processing`, `requires_action`, `unknown`, and `reconciliation` are
non-success. Report success only on terminal `succeeded` from
that authoritative Wathba fetch or a verified signed Wathba webhook. Never call
a provider status endpoint or issue a duplicate intent as a probe.

## 5. Refunds

Use the signed `requestPaymentRefund` operation (`POST
/v1/platform/projects/{projectId}/payments/{paymentId}/refunds`,
`payments:refunds:create`) with its own `Idempotency-Key`. Read the result only
through the signed `getPaymentRefund` or `listPaymentRefunds` operations with
`payments:refunds:read`. A pending refund stays pending until the authoritative
Wathba status is terminal. Never call Moyasar's refund API directly.

## 6. Test versus production mode

`environmentId` selects test or production mode. The member stores only its
Wathba test-environment project key in the application's trusted test secret
store. Moyasar test and production credentials stay inside Wathba. Create a
test intent, complete the payer flow, and confirm the fetched Wathba status before
switching the deployed server to its Wathba production-environment key. Never
mix environment IDs and keys.

## 7. Never expose

Beyond the core safety rules, for payments specifically never ask for, print,
store, or forward:

- Moyasar API keys or Moyasar payment/token IDs;
- webhook shared secrets;
- raw provider request or response payloads;
- card account details, verification digits, or checkout delivery tokens.

Only the trusted member app holds the Wathba project API key. The agent sees
only safe metadata via `wathba key list`.

## 8. Verify

Use the repository's own tests with a mocked Wathba transport, then let the
member run a controlled test-environment checkout from the trusted application.
Confirm its status through the same application flow. Do not charge a real
card, touch production, or ask to see the key. Report concrete test evidence;
the CLI does not certify a `READY` state.

When the signed Catalog 017 pin is published and resolved, `wathba capability
verify payments.checkout --project <projectId> --environment <environmentId>
--service <serviceCode> --mode contract --idempotency-key <stable-key> --json
--no-input` consumes
`verify_payments_checkout_017`. Its required checks are `activation`, `scope`,
`payment_intent_contract`, `checkout_token_delivery`, `method_readiness`,
`payment_link_authorization`, `provider_readiness`, `webhook_delivery`, and
`payer_page_contract`; an unknown outcome remains blocked. Older signed pins
retain their own verification profiles.

`wathba integrate payments.checkout --project-dir . --project <projectId>
--environment <environmentId> --service <serviceCode> --json --no-input`
resolves the exact pinned bundle for the discovered service and installs its signed skill and server recipe. It does not tokenize a
card, execute a payment or refund, expose credentials, or bypass signed skill
trust and verification.
