-- Resolved place labels from reverse geocoding (optional; null for older rows).
ALTER TABLE animal_reports
  ADD COLUMN IF NOT EXISTS location_continent text,
  ADD COLUMN IF NOT EXISTS location_country text,
  ADD COLUMN IF NOT EXISTS location_region text;
