# Scoped production repair — 2026-10-24

Isolated source baseline: gestoria-repair-20261024, preserving earlier OCR, staff MFA, dashboard metrics, self-password, public request/booking/portal-revocation fixes. No dirty project checkout was built or changed and no GitHub push was performed.

## Dependencies

Next16.3.8 → **16.4.1** in web, CRM and portal. This is the minimum published corrected version for the three official advisories below (all include Next16 <=16.4.0). npm latest was16.4.3 when checked; latest was not used as a security assumption. React/ReactDOM18.3.1 and sharp0.35.5 unchanged. Next official peer ranges admit React18.3.1; embedded App Router ReactDOM/RSC revision matches19.3.0-canary-278794d7-20261002. Do not independently override react-server-dom packages.

- https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw
- https://github.com/vercel/next.js/security/advisories/GHSA-673q-mjm6-r5xr
- https://github.com/vercel/next.js/security/advisories/GHSA-p3m5-59mp-jv5r
- https://registry.npmjs.org/next/16.4.1
- https://raw.githubusercontent.com/vercel/next.js/v16.4.1/packages/next/src/compiled/react-server-dom-webpack/package.json

Lock reproducible with npm ci in all three image builds. Changes beyond next/env/SWC are optional dev Tailwind WASI dependency placement/version normalization by npm; no unrelated required production package changed. npm official bulk audit against106 production dependency package names returned no advisory packages at check time. This is not an exhaustive security certification.

## Schema and startup

See20261024-dossier-schema-repair.md and20261024-runtime-migration-guard.md. Apply only the explicit targeted additive SQL transaction. Never enable all pending migrations for this repair. Migration-time created_at is not reconstructed historic creation time. Ordinary production restarts now perform readiness assertions but no pending migrations/seeding with RUN_MIGRATIONS=false/unset.

## MFA limitation

No MFA/auth decoder or key policy change. One preexisting enrolled staff record has unsupported bare Base32 storage, not an authenticated envelope; ownership/authenticator provenance requires a separately authorized recovery verification. The other envelope decrypts using the unchanged production key. Do not disable/reset MFA, rotate the global key or add permissive fallback based only on parseable syntax.

## Verification and handoff

Protected evidence: /opt/backups/gestoria-final-repair-20261024/RESULT.md and RELEASE.json. Exact final image API/browser suites use schema-only PostgreSQL/tmpfs/internal networking and synthetic identities only. Production probes use anonymous reads/empty invalid payloads, no real-account login or business writes. Manual payment is a recording flow, not a provider charge. External AI/payment/email/messaging remain untested.

reviewable.patch is an incremental delta against gestoria-repair-20261024. source-for-pc.tar.gz provides the complete source without environments, node_modules, compiled output, uploads or database records. Retain local environment keys; do not overwrite PC settings from server configuration. No Git commit/push is asserted for these non-Git release directories.
