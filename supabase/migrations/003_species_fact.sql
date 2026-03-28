-- Short educational fact from OpenAI Vision (optional; null for older rows).
ALTER TABLE animal_reports
  ADD COLUMN IF NOT EXISTS species_fact text;
