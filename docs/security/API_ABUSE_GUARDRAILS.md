# API abuse and spend guardrails

Status: foundational database controls applied to Supabase project `nexus-finance` on 2026-11-24.

## Current fail-closed state

- `private.api_security_config.emergency_stop = true`
- `private.api_security_config.paid_api_enabled = false`
- `daily_global_budget_usd = 0`
- All user entitlements default to `paid_access = false`
- No third-party AI/API provider or Supabase Edge Function is currently deployed.
- No provider secret is configured in the frontend. The frontend Supabase key is a publishable key and is not an administrative secret.

Do not enable paid API calls until a server-side gateway, provider secret, verified subscription/entitlement source, provider-specific price calculation, budget owner, and alert destination are configured.

## Database controls installed

Private schema tables:
- `private.api_security_config`: global kill switch, paid API enablement, daily budget, per-user request/token limits, per-request cost ceiling, input/output token caps, and concurrency limit.
- `private.api_user_entitlements`: server-managed paid access and per-user overrides. Never populate this from user-editable metadata or browser input.
- `private.api_usage_reservations`: idempotency key, provider/model, token estimate, reserved/actual cost, status, and expiry.

Server-only functions:
- `public.reserve_api_usage(...)`: atomic reservation before a paid call. Serializes reservations against the global budget, checks entitlement, per-user quotas, token caps, concurrency, request cost, and duplicate idempotency keys.
- `public.settle_api_usage(...)`: records actual cost; if actual cost would exceed the configured global budget, marks the reservation failed and activates the emergency stop.
- `public.release_api_usage(...)`: releases a reservation only when the gateway has established that no paid operation remains in flight.

Execution is revoked from `PUBLIC`, `anon`, and `authenticated`; only `service_role` can execute the functions. Private tables have RLS and service-role-only policies. Never expose the service-role key to browser code.

## Conservative initial limits

Global defaults (not yet enabled):
- 20 requests/user/day
- 10,000 input + output tokens/user/day
- 4,000 input tokens/request
- 1,000 output tokens/request
- 1 concurrent request/user
- USD 0.05 maximum estimated cost/request
- USD 0 daily global budget until the owner sets a real budget

User entitlements default to no paid access. A trusted backend must grant paid access only after checking the payment provider/subscription server-side.

## Required before enabling a paid provider

1. Deploy an Edge Function/API gateway that verifies the Supabase JWT with `getUser()`, rejects anonymous/unverified users as appropriate, and never trusts user-supplied user IDs, model names, prices, roles, or token counts.
2. Store provider secrets only in Supabase Edge Function secrets or a dedicated secret manager. Keep separate test and production projects/keys. Rotate any provider secret if exposure is suspected.
3. Fix provider/model, max output tokens, context window, request timeout, retry policy, and cost calculation in server code. Never accept arbitrary model or provider URLs from the client.
4. Validate request body size and chat history length; trim/summarize old messages and enforce input/output token limits before provider invocation.
5. Call `reserve_api_usage` before the paid call, pass a server-generated idempotency key, and settle/release on every terminal path. Use bounded retries only for transient errors; do not retry permanent 4xx errors.
6. Add IP + user rate limits at the gateway/WAF and CAPTCHA/Turnstile to public signup and other abuse-prone forms. Configure Supabase Auth CAPTCHA and email/OTP rate limits in the Auth dashboard.
7. Verify paid entitlement server-side from a trusted billing webhook/provider; protect checkout with provider anti-fraud controls and idempotency. No billing provider is integrated yet.
8. Add per-provider and per-user cost telemetry, budget threshold alerts, hard stop, and an operator notification destination.
9. Configure storage policies, signed upload/download URLs, upload size/type limits, archive decompression limits, image pixel limits, processing deadlines, temporary-object cleanup, and log retention before enabling uploads that trigger paid processing.
10. Configure scheduled-job overlap protection, bounded batches/query result limits, function concurrency/instance limits, and recursion guards for any future jobs/triggers.
11. Run adversarial parallel-request tests with a real test user and provider sandbox. Confirm only one reservation is created for a duplicate idempotency key and concurrent requests cannot exceed user/global limits.

## Important limitation

The database reservation primitives are installed and verified, but they do not themselves proxy an external API, inspect actual provider token usage, enforce IP rate limits, send alerts, run CAPTCHA, protect checkout, or clean storage. Those controls require a server gateway, selected vendors, dashboard configuration, and end-to-end tests. Paid API access remains disabled by design.
