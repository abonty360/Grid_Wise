-- Migration: 001_create_energy_scenarios
-- Purpose: Store submitted energy scenarios (24-hour data + battery config)
-- Rule: Never modify this file after it has been applied to any environment.

CREATE TABLE IF NOT EXISTS energy_scenarios (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id   UUID NOT NULL UNIQUE,        -- Client-provided scenario ID

  -- Battery configuration (snapshot at time of submission)
  battery_capacity_kwh         NUMERIC(10, 4) NOT NULL,
  battery_current_charge_kwh   NUMERIC(10, 4) NOT NULL,
  battery_max_charge_rate_kw   NUMERIC(10, 4) NOT NULL,
  battery_max_discharge_rate_kw NUMERIC(10, 4) NOT NULL,
  battery_efficiency           NUMERIC(5, 4)  NOT NULL
                                 CHECK (battery_efficiency BETWEEN 0 AND 1),

  -- Raw hourly data (stored as JSONB for flexibility)
  hours_data    JSONB NOT NULL,              -- Array of 24 HourData objects

  -- Metadata
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup by scenario_id
CREATE INDEX IF NOT EXISTS idx_energy_scenarios_scenario_id
  ON energy_scenarios (scenario_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_energy_scenarios_updated_at
  BEFORE UPDATE ON energy_scenarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE energy_scenarios IS
  'Submitted 24-hour energy scenarios including battery configuration and hourly data.';
