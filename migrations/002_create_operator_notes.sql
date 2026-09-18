-- Migration: 002_create_operator_notes
-- Purpose: Store operator notes and their LLM-interpreted directives
-- Rule: Never modify this file after it has been applied to any environment.

CREATE TABLE IF NOT EXISTS energy_operator_notes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id    UUID NOT NULL REFERENCES energy_scenarios(scenario_id)
                   ON DELETE CASCADE,

  -- Raw operator input
  raw_notes      TEXT[] NOT NULL,            -- Array of raw note strings

  -- LLM output
  llm_provider   TEXT,                       -- e.g. 'openai', 'anthropic'
  llm_model      TEXT,                       -- e.g. 'gpt-4o'
  directives     JSONB,                      -- Array of Directive objects
  interpretation_summary TEXT,              -- LLM-generated summary

  -- Processing metadata
  processing_time_ms INTEGER,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for joining with scenarios
CREATE INDEX IF NOT EXISTS idx_energy_operator_notes_scenario_id
  ON energy_operator_notes (scenario_id);

COMMENT ON TABLE energy_operator_notes IS
  'Operator notes submitted with each scenario and their LLM directive interpretations.';

COMMENT ON COLUMN energy_operator_notes.directives IS
  'JSONB array of Directive objects: { type, description, constraint, confidence }';
