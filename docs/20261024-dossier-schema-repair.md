# Targeted dossier checklist repair (2026-10-24)

## Cause and contract

Live `dossier_steps` already has `required BOOLEAN NOT NULL DEFAULT TRUE`, `status VARCHAR(20) NOT NULL DEFAULT 'pending'`, `position INTEGER NOT NULL DEFAULT 0`, and nullable `completed_at TIMESTAMPTZ`. Its older base schema did not have `due_date` or `created_at`; the normal migration's CREATE IF NOT EXISTS did not add them to an existing table. Thus GET dossier detail and POST step return SQLSTATE 42703.

After those columns are added, the existing PATCH query exposes SQLSTATE 42P08: the reused `$1` is inferred as both text and varchar. Explicit `$1::varchar` in assignment and comparison preserves the contract and fixes it. No status/permission contract is expanded.

The actual UI at `frontend/src/app/crm/expedientes/[id]/page.tsx` reads detail arrays, dates and `status`, toggles completed/pending via PATCH, and creates private notes. It contains no checklist/dossier DELETE contract, so none was added. POST checklist remains an existing API operation. UI source contract checked; no browser-rendering claim is made by this gate.

## Exact targeted SQL

Run only `backend/src/db/migrations/20261024-dossier-step-dates.sql`, explicitly, with ON_ERROR_STOP and the existing PostgreSQL operator connection. Keep RUN_MIGRATIONS=false for deployment. Do not run the entire startup migration bundle as this repair: it contains unrelated DDL and service seeding.

```sql
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.dossier_steps ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE public.dossier_steps ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
COMMIT;
```

`due_date` is optional and defaults NULL; `created_at` is non-null with CURRENT_TIMESTAMP, matching the intended migration CREATE contract. Existing rows receive migration-time created_at (not a reconstructed historical creation date). All prior fields, including legacy is_completed/order_index, status, position and completed_at, remain unchanged; no interpretation/backfill of historical state is introduced. Repeating SQL does not rewrite timestamps. IF NOT EXISTS does not validate an already-present column of an unexpected type: inspect before applying.

The fresh base schema now declares all operational fields. The normal dossier-only migration block adds the two absent columns as well. Both image Dockerfiles package the updated fresh-init schema; the repair image also includes the compiled migration module. Merely building/running an image with migrations disabled does not apply SQL.

## Deployment handoff, not authorization to deploy

The coordinating main agent owns production backup/reviewer/deployment. Before application it must have its normal verified backup, confirm current types/defaults and target DB identity, review this exact SQL and the route delta. Lock timeout aborts atomically; do not widen the timeout or run unrelated pending migrations automatically. Apply the two-column SQL before or with the candidate image, then perform the coordinator's authorized smoke checks. No production migration, valid business write, login or deployment was performed by this task.

Rollback the candidate route image if necessary; leave the additive columns in place. Dropping them would destroy future checklist dates and is not a routine rollback. Restore only through the coordinator's approved recovery procedure if independently required.

## Evidence and gates

`/opt/backups/gestoria-final-repair-20261024/dossier-*`:

- `dossier-red.json`: exact live backend sha256:dfd25a636ad177c9caab815e68d5e8d2817d9290b614a0f724dc89d9690cc67f + fresh live schema-only dump, GET=500 and POST=500, both SQLSTATE 42703 in isolated backend logs.
- `dossier-schema-only-green-patch-red.json`: two added columns make GET/POST pass; PATCH still fails 500 with SQLSTATE 42P08. This is the independent RED for the varchar fix.
- `dossier-green.json`: reproducible candidate image, nine API gates PASS: GET payload; dated/undated/default/optional POST; completion/reopen dates; cross-dossier step 404; anonymous 401 and portal roles 403; portal cross-client isolation; missing-resource/blank-title errors; private notes/activity. Sessions are issued only for synthetic fixtures; no real login.
- `dossier-schema-check.json`: legacy field preservation, stable repeat application, fresh/migrated column/type/nullability/default equality; actual normal migration dossier block exercised without unrelated pending migrations.
- `dossier-init.json`: actual packaged `node dist/db/init.js` against a new empty isolated DB succeeds and produces matching dossier_steps.
- `dossier-schema-canonical.diff`: after identical schema-only restore normalization, exactly two columns differ. Raw dump differences also contain PostgreSQL constraint deparse normalization and random dump restrict markers, not extra migrations.
- `dossier-candidate-image.json`, `dossier-build.log`: immutable candidate identity and successful build.
- `dossier-unit-tests.log`: 44 tests, 42 pass, 2 pre-existing skips, 0 fail. TypeScript compilation passed with `node node_modules/typescript/bin/tsc`; copied `.bin/tsc` in this release snapshot has a broken relative path, so direct installed compiler entrypoint was used.

All services used dedicated internal network `dossier-fix-aae837-20261024`, own named containers, tmpfs DB/uploads, no published ports or production mounts. No shared main harness changed. No writes to `/opt/projects/rp-gestoria-real`.

Reproduction: `dossier-setup.py`; copy `dossier-api.mjs` to `/app` of the isolated API and run `node dossier-api.mjs red`; apply only targeted SQL to isolated DB; compile/build candidate and start using `dossier-candidate.py`; run `node dossier-api.mjs green` on candidate. Allow health readiness before requests. The integration script is also saved as `backend/test/dossier-schema.integration.mjs`; it hard-guards the isolated DB hostname. Schema preservation harness is `dossier-schema-check.py`.
