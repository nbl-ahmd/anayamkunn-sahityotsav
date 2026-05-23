CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  unit_text JSONB NOT NULL,
  counter_text JSONB NOT NULL,
  family_text JSONB NOT NULL,
  frame_viewport JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS frames (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS framed_records (
  id UUID PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  unit TEXT NOT NULL,
  frame_id TEXT NOT NULL,
  family_name TEXT,
  counter INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS app_counters (
  id SMALLINT PRIMARY KEY,
  global_counter INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS app_settings (
  id SMALLINT PRIMARY KEY,
  settings JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS unit_manual_counts (
  template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  unit TEXT NOT NULL,
  manual_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (template_id, unit)
);

CREATE INDEX IF NOT EXISTS idx_framed_records_template_created
ON framed_records(template_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_framed_records_template_unit
ON framed_records(template_id, unit);

INSERT INTO app_counters (id, global_counter)
VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO app_settings (id, settings)
VALUES (1, '{"sahithyolsavDate": null}'::jsonb)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS result_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  scope_type TEXT NOT NULL,
  scope_value TEXT,
  background_image TEXT,
  size JSONB NOT NULL,
  fields JSONB NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS result_ads (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  range_start INTEGER NOT NULL,
  range_end INTEGER NOT NULL,
  scope_type TEXT NOT NULL,
  scope_value TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS result_counters (
  id SMALLINT PRIMARY KEY,
  next_result_number INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS published_results (
  id UUID PRIMARY KEY,
  program_id TEXT NOT NULL UNIQUE,
  competition_name TEXT NOT NULL,
  category TEXT NOT NULL,
  category_group TEXT NOT NULL,
  result_number INTEGER NOT NULL UNIQUE,
  entries JSONB NOT NULL,
  template_id TEXT NOT NULL REFERENCES result_templates(id),
  ad_id TEXT REFERENCES result_ads(id),
  poster_image_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'published',
  published_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_published_results_number
ON published_results(result_number DESC);

INSERT INTO result_counters (id, next_result_number)
VALUES (1, 1)
ON CONFLICT (id) DO NOTHING;
