# Readiness repair: public requests, dossiers, bookings and portal revocation

Baseline: `/opt/releases/gestoria-password-20261023`, upstream d494623af11cea3c444d6793587793206ed2681f plus deployed OCR/MFA/metrics/self-password patches. This release does not alter dependencies, database schema, credentials or MFA policy.

All dossier writers must call `nextDossierCode` inside their transaction, before acquiring a client row lock. It holds the shared numbering advisory lock and uses numeric MAX over well-formed current-year codes. This avoids text/integer COALESCE, lexical ordering after 9999, duplicate codes and opposite lock ordering between CRM and public requests.

Public appointment reminders use `reminder_interval`, not reserved SQL `offset`.

The existing two-step client+dossier UI keeps confirmed client, dossier and upload stages in memory. A retry resumes the pending stage, including mixed batches. Edited saved submissions are explicitly rejected instead of claiming changes were saved; edit existing records in the directory. Stages/one-time credentials are never persisted to browser storage. Reloading still requires existing identity resolution; the existing unique BSN constraint remains authoritative. No real partially created records were repaired or removed.

Portal sessions require the current `clients.user_id` relationship and `status='activo'` at login, issuance and every authenticated request. Issuance holds a client SHARE lock through session COMMIT. CRM state changes hold a client write lock and then delete client-role sessions in a *separate SQL statement* in the same transaction: using a single data-changing CTE can miss a session committed while waiting on the client lock, due to the statement snapshot. Reactivation preserves password/MFA and permits fresh login; revoked tokens never revive. Staff sessions/MFA are untouched.

Release evidence and regression scripts: `/opt/backups/gestoria-repair-20261024`. Gates use exact candidate images against internal Docker networking, schema-only PostgreSQL/tmpfs and synthetic accounts. Live checks never submit valid business writes or authenticate real accounts. Provider delivery/payment remains outside this release.
