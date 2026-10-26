-- Targeted additive repair only. Run explicitly; do not enable all pending migrations.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.dossier_steps ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE public.dossier_steps ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
COMMIT;
