CREATE TABLE IF NOT EXISTS public_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key VARCHAR(80) NOT NULL,
  locale VARCHAR(2) NOT NULL DEFAULT 'ES',
  version INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  seo_title VARCHAR(160) NOT NULL DEFAULT '',
  seo_description VARCHAR(320) NOT NULL DEFAULT '',
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(page_key, locale, version),
  CHECK (locale IN ('ES','EN','NL')),
  CHECK (status IN ('draft','published'))
);
CREATE INDEX IF NOT EXISTS idx_public_content_lookup ON public_content(page_key, locale, status, version DESC);
