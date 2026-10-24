# Explicit production migrations (2026-10-24)

Independent release review found the previous startup flag gated security migrations only. Portal/general migrations still ran on every production restart (real synthetic RED: 8 DDL statements and 14 seeded catalog rows with RUN_MIGRATIONS=false).

All startup migration phases now share the existing opt-in policy: run when RUN_MIGRATIONS=true or outside production. Production false/unset performs readiness checks but no schema/seed operations. Explicit true and development preserve the existing migration order. No readiness or auth assertion is skipped.

This release applies only the separate targeted two-column dossier SQL using the operator connection. Do not enable general runtime migrations to install this repair.

Exact-image RED/GREEN proof and SQL-log counts: /opt/backups/gestoria-final-repair-20261024/startup-no-ddl-{red,green}.json; reproducible isolated harness startup-no-ddl-check.py; no production rows/logins in that proof.
