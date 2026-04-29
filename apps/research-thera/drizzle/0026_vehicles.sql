-- =============================================================================
-- 0026_vehicles.sql
--
-- Purpose:
--   Vehicle tracking module merged from the standalone apps/my-car app.
--   Tables: vehicles, vehicle_photos, vehicle_service_records (per-user).
-- =============================================================================

CREATE TABLE IF NOT EXISTS vehicles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         text NOT NULL,
  make            text NOT NULL,
  model           text NOT NULL,
  year            integer NOT NULL,
  vin             text,
  license_plate   text,
  nickname        text,
  odometer_miles  integer,
  color           text,
  notes           text,
  created_at      timestamp NOT NULL DEFAULT now(),
  updated_at      timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vehicles_user_idx ON vehicles (user_id);

CREATE TABLE IF NOT EXISTS vehicle_photos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id    uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  r2_key        text NOT NULL,
  content_type  text NOT NULL,
  size_bytes    integer NOT NULL,
  caption       text,
  created_at    timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vehicle_photos_vehicle_idx ON vehicle_photos (vehicle_id);

CREATE TABLE IF NOT EXISTS vehicle_service_records (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id      uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  type            text NOT NULL,
  service_date    timestamp NOT NULL,
  odometer_miles  integer,
  cost_cents      integer,
  vendor          text,
  notes           text,
  created_at      timestamp NOT NULL DEFAULT now(),
  updated_at      timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vehicle_service_records_vehicle_idx ON vehicle_service_records (vehicle_id);
CREATE INDEX IF NOT EXISTS vehicle_service_records_date_idx ON vehicle_service_records (service_date DESC);
