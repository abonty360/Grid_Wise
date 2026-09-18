-- Migration 005: Update energy_scenarios to link with users, add extra fields
-- Rule: Never modify after applying.

ALTER TABLE energy_scenarios
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS name TEXT DEFAULT 'Unnamed Scenario',
  ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft','optimized','error'));

ALTER TABLE energy_plans
  ADD COLUMN IF NOT EXISTS scenario_name TEXT,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_energy_scenarios_user_id ON energy_scenarios(user_id);
CREATE INDEX IF NOT EXISTS idx_energy_plans_user_id ON energy_plans(user_id);

COMMENT ON COLUMN energy_scenarios.name IS 'Human-readable scenario name.';
COMMENT ON COLUMN energy_scenarios.status IS 'Scenario lifecycle status.';
