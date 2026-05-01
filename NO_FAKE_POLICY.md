# NO FAKE / NO MOCK / NO PLACEHOLDER POLICY

## Purpose
This repository must ship production-real behavior and production-real data surfaces.

## Hard Rules
1. No fake data in production modules.
2. No mock logic in production modules.
3. No placeholder responses in production modules.
4. No "coming soon" behavior in runtime code paths.
5. No demo-only identity/account responses in runtime code paths.

## Production Modules (Policy Scope)
- cli/
- engines/
- memory/
- schema/
- landing-page.html
- developers.html

## Allowed
1. Real error messages when an integration is unavailable.
2. Explicit hard-fail behavior instead of fake fallback.
3. Test doubles only inside dedicated test files/folders.

## Enforcement
1. CI runs `npm run check:no-fake`.
2. Any violation fails the pipeline.
3. Violations must be removed before merge/deploy.

## Endpoint Contract Rules
1. Runtime endpoint handlers and response contracts must not include demo/dummy/test identity values.
2. Hard-coded sample session tokens and sample license keys are blocked.
3. If a payment/provider integration is unavailable, return explicit production error contracts only.

## Allowlist (Test-Only)
1. Allowlist is defined in `.no-fake-allowlist.json`.
2. Allowlist is for test paths only (`tests`, `__tests__`, `spec`, `fixtures`, `mocks`).
3. Every allowlist rule must include `reason` and `expiresAt`.
4. Expired allowlist rules are ignored automatically.

## Developer Commitment
If a module cannot be implemented fully yet, it must fail explicitly with a real error contract. It must not pretend to be implemented.
