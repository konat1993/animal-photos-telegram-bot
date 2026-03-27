CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS animal_reports (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  telegram_user_id text NOT NULL,
  photo_path text NOT NULL,
  photo_url text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  identified_species text NOT NULL,
  confidence numeric,
  safety_note text NOT NULL,
  raw_ai_response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_animal_reports_created_at ON animal_reports (created_at);
CREATE INDEX idx_animal_reports_species ON animal_reports (identified_species);

ALTER TABLE animal_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_anon_select" ON animal_reports FOR SELECT TO anon USING (true);
