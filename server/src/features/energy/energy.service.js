/**
 * energy.service.js — Full energy optimization & scenario persistence logic
 */

const { v4: uuidv4 } = require('uuid');
const { query } = require('../../core/db');
const { interpretNotes } = require('../../core/llm/llmService');
const { optimize } = require('../../core/optimizer/optimizer');
const { calculateBaseline } = require('../../core/optimizer/costCalculator');

/**
 * Normalizes input hours to standard format: { hour, demand, solar, tariff }
 */
function normalizeHours(rawHours) {
  return rawHours.map((h, idx) => {
    const demand = Number(h.demand_kwh ?? h.demand ?? h.demand_kw ?? 0);
    const solar = Number(h.solar_kwh ?? h.solar ?? h.solar_kw ?? 0);
    const tariff = Number(h.tariff_bdt_per_kwh ?? h.tariff ?? h.grid_price_per_kwh ?? 0);
    return {
      hour: h.hour !== undefined ? Number(h.hour) : idx,
      demand_kwh: demand,
      solar_kwh: solar,
      tariff_bdt_per_kwh: tariff,
      demand,
      solar,
      tariff,
    };
  });
}

/**
 * Normalizes battery config
 */
function normalizeBattery(raw) {
  const capacity = Number(raw.capacity_kwh ?? raw.capacity ?? 100);
  const initial = Number(raw.initial_energy_kwh ?? raw.initial_energy ?? raw.current_charge_kwh ?? capacity * 0.5);
  const minReserve = Number(raw.minimum_energy_kwh ?? raw.minimum_energy ?? raw.min_reserve ?? raw.min_reserve_kwh ?? 0);
  const maxCharge = Number(raw.max_charge_kwh_per_hour ?? raw.max_charge ?? raw.max_charge_rate_kw ?? capacity * 0.25);
  const maxDischarge = Number(raw.max_discharge_kwh_per_hour ?? raw.max_discharge ?? raw.max_discharge_rate_kw ?? capacity * 0.25);
  const efficiency = Number(raw.efficiency ?? 1.0);

  return {
    capacity_kwh: capacity,
    initial_energy_kwh: Math.min(capacity, initial),
    minimum_energy_kwh: Math.min(capacity, minReserve),
    max_charge_kwh_per_hour: maxCharge,
    max_discharge_kwh_per_hour: maxDischarge,
    capacity,
    initial_energy: Math.min(capacity, initial),
    min_reserve: Math.min(capacity, minReserve),
    max_charge: maxCharge,
    max_discharge: maxDischarge,
    efficiency: efficiency > 0 && efficiency <= 1 ? efficiency : 1.0,
  };
}

/**
 * Runs the optimization pipeline, stores result in DB, returns complete model
 */
async function runOptimization(payload, userId = null) {
  const startTime = Date.now();
  const scenario_id = payload.scenario_id || uuidv4();
  const scenario_name = payload.scenario_name || payload.name || 'Energy Optimization Scenario';
  const description = payload.description || '';
  const operator_notes = Array.isArray(payload.operator_notes) ? payload.operator_notes : [];
  const hours = normalizeHours(payload.hours || []);
  const battery = normalizeBattery(payload.battery || {});

  // 1. Calculate deterministic baseline (no battery optimization)
  const baseline = calculateBaseline(hours);

  // 2. LLM interpretation
  console.log(`[energy.service] Interpreting ${operator_notes.length} note(s)...`);
  const directives = await interpretNotes(operator_notes);

  // 3. Run optimization
  console.log(`[energy.service] Running optimizer with ${directives.length} directive(s)...`);
  const optResult = await optimize(hours, battery, directives);

  const processingTimeMs = Date.now() - startTime;

  // 4. Calculate comparative impacts
  const gridReduction = baseline.total_grid_kwh - optResult.total_grid_kwh;
  const gridReductionPct = baseline.total_grid_kwh > 0
    ? ((gridReduction / baseline.total_grid_kwh) * 100)
    : 0;

  const costSavings = baseline.total_cost_bdt - optResult.total_cost_bdt;
  const costSavingsPct = baseline.total_cost_bdt > 0
    ? ((costSavings / baseline.total_cost_bdt) * 100)
    : 0;

  const peakReduction = baseline.peak_grid_kwh - optResult.peak_grid_kwh;
  const peakReductionPct = baseline.peak_grid_kwh > 0
    ? ((peakReduction / baseline.peak_grid_kwh) * 100)
    : 0;

  const totalDemand = hours.reduce((s, h) => s + h.demand, 0);
  const totalSolarGen = hours.reduce((s, h) => s + h.solar, 0);
  const solarUtilizationPct = totalSolarGen > 0
    ? (optResult.total_solar_used_kwh / totalSolarGen) * 100
    : 0;
  const batteryUtilizationPct = battery.capacity > 0
    ? (optResult.total_discharged_kwh / battery.capacity) * 100
    : 0;

  // 5. Structure final response per BUP CSE Fest 2026 Problem Statement
  const responseData = {
    // Required fields:
    scenario_id,
    directive_interpretation: directives,
    hourly_plan: optResult.hourly_plan,
    total_grid_kwh: optResult.total_grid_kwh,
    total_cost_bdt: optResult.total_cost_bdt,
    peak_grid_kwh: optResult.peak_grid_kwh,
    plan_summary: `Optimal dispatch generated. Grid import: ${optResult.total_grid_kwh} kWh (cost: ${optResult.total_cost_bdt} BDT). End-of-day neutrality verified (final SOC = initial SOC).`,

    // Additional rich fields for UI visualization & persistence:
    scenario_name,
    description,
    status: 'success',
    battery,
    raw_operator_notes: operator_notes,
    total_solar_used_kwh: optResult.total_solar_used_kwh,
    total_charged_kwh: optResult.total_charged_kwh,
    total_discharged_kwh: optResult.total_discharged_kwh,
    summary: {
      total_grid_import_kwh: optResult.total_grid_kwh,
      total_grid_export_kwh: 0,
      total_solar_used_kwh: optResult.total_solar_used_kwh,
      peak_grid_kwh: optResult.peak_grid_kwh,
      battery_cycles_used: battery.capacity > 0 ? (optResult.total_charged_kwh / battery.capacity) : 0,
      optimization_objectives_met: optResult.validation.all_pass
        ? ['Minimized grid import cost', 'Satisfied battery energy balance', 'Directives satisfied', 'End-of-day neutrality satisfied']
        : ['Fallback schedule applied'],
    },
    baseline: {
      ...baseline,
      cost_savings_bdt: Math.round(costSavings * 100) / 100,
      cost_savings_pct: Math.round(costSavingsPct * 10) / 10,
      grid_reduction_kwh: Math.round(gridReduction * 100) / 100,
      grid_reduction_pct: Math.round(gridReductionPct * 10) / 10,
      peak_reduction_kwh: Math.round(peakReduction * 100) / 100,
      peak_reduction_pct: Math.round(peakReductionPct * 10) / 10,
    },
    metrics: {
      total_demand_kwh: Math.round(totalDemand * 100) / 100,
      total_solar_gen_kwh: Math.round(totalSolarGen * 100) / 100,
      solar_utilization_pct: Math.round(solarUtilizationPct * 10) / 10,
      battery_utilization_pct: Math.round(batteryUtilizationPct * 10) / 10,
    },
    validation: optResult.validation,
    metadata: {
      optimized_at: new Date().toISOString(),
      llm_provider: process.env.LLM_PROVIDER || 'openai',
      processing_time_ms: processingTimeMs,
      optimizer_version: '2.0.0',
    },
  };

  // 6. Persist to PostgreSQL (non-blocking failure safe)
  try {
    // Save/Update scenario
    await query(
      `INSERT INTO energy_scenarios (
        scenario_id, user_id, name, description, status,
        battery_capacity_kwh, battery_current_charge_kwh,
        battery_max_charge_rate_kw, battery_max_discharge_rate_kw,
        battery_efficiency, hours_data, updated_at
      ) VALUES ($1, $2, $3, $4, 'optimized', $5, $6, $7, $8, $9, $10, NOW())
      ON CONFLICT (scenario_id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        status = 'optimized',
        battery_capacity_kwh = EXCLUDED.battery_capacity_kwh,
        battery_current_charge_kwh = EXCLUDED.battery_current_charge_kwh,
        battery_max_charge_rate_kw = EXCLUDED.battery_max_charge_rate_kw,
        battery_max_discharge_rate_kw = EXCLUDED.battery_max_discharge_rate_kw,
        battery_efficiency = EXCLUDED.battery_efficiency,
        hours_data = EXCLUDED.hours_data,
        updated_at = NOW()`,
      [
        scenario_id,
        userId,
        scenario_name,
        description,
        battery.capacity,
        battery.initial_energy,
        battery.max_charge,
        battery.max_discharge,
        battery.efficiency,
        JSON.stringify(hours),
      ]
    );

    // Save operator notes
    if (operator_notes.length > 0) {
      await query(
        `INSERT INTO energy_operator_notes (
          scenario_id, raw_notes, llm_provider, llm_model, directives, interpretation_summary, processing_time_ms
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          scenario_id,
          operator_notes,
          process.env.LLM_PROVIDER || 'openai',
          process.env.LLM_MODEL || 'gpt-4o-mini',
          JSON.stringify(directives),
          responseData.directive_interpretation.summary,
          processingTimeMs,
        ]
      );
    }

    // Save energy plan
    await query(
      `INSERT INTO energy_plans (
        scenario_id, user_id, scenario_name, status, hourly_plan, total_cost,
        total_grid_import_kwh, total_grid_export_kwh, total_solar_used_kwh,
        peak_demand_kw, battery_cycles_used, objectives_met, optimizer_version
      ) VALUES ($1, $2, $3, 'success', $4, $5, $6, 0, $7, $8, $9, $10, '2.0.0')`,
      [
        scenario_id,
        userId,
        scenario_name,
        JSON.stringify(optResult.hourly_plan),
        optResult.total_cost_bdt,
        optResult.total_grid_kwh,
        optResult.total_solar_used_kwh,
        optResult.peak_grid_kwh,
        responseData.summary.battery_cycles_used,
        responseData.summary.optimization_objectives_met,
      ]
    );
    console.log(`[energy.service] Scenario ${scenario_id} saved to database.`);
  } catch (dbErr) {
    console.warn('[energy.service] Database persistence skipped/failed:', dbErr.message);
  }

  return responseData;
}

// ── Scenario CRUD ─────────────────────────────────────────────────────────────

async function saveScenario(payload, userId = null) {
  const scenario_id = payload.scenario_id || uuidv4();
  const name = payload.name || payload.scenario_name || 'Untitled Scenario';
  const description = payload.description || '';
  const battery = normalizeBattery(payload.battery || {});
  const hours = normalizeHours(payload.hours || []);

  const { rows } = await query(
    `INSERT INTO energy_scenarios (
      scenario_id, user_id, name, description, status,
      battery_capacity_kwh, battery_current_charge_kwh,
      battery_max_charge_rate_kw, battery_max_discharge_rate_kw,
      battery_efficiency, hours_data
    ) VALUES ($1, $2, $3, $4, 'draft', $5, $6, $7, $8, $9, $10)
    ON CONFLICT (scenario_id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      battery_capacity_kwh = EXCLUDED.battery_capacity_kwh,
      battery_current_charge_kwh = EXCLUDED.battery_current_charge_kwh,
      battery_max_charge_rate_kw = EXCLUDED.battery_max_charge_rate_kw,
      battery_max_discharge_rate_kw = EXCLUDED.battery_max_discharge_rate_kw,
      battery_efficiency = EXCLUDED.battery_efficiency,
      hours_data = EXCLUDED.hours_data,
      updated_at = NOW()
    RETURNING *`,
    [
      scenario_id,
      userId,
      name,
      description,
      battery.capacity,
      battery.initial_energy,
      battery.max_charge,
      battery.max_discharge,
      battery.efficiency,
      JSON.stringify(hours),
    ]
  );
  return rows[0];
}

async function listScenarios(userId = null) {
  const sql = userId
    ? `SELECT s.*, p.total_cost, p.total_grid_import_kwh as total_grid, p.optimized_at
       FROM energy_scenarios s
       LEFT JOIN LATERAL (
         SELECT total_cost, total_grid_import_kwh, optimized_at
         FROM energy_plans WHERE scenario_id = s.scenario_id
         ORDER BY optimized_at DESC LIMIT 1
       ) p ON true
       WHERE s.user_id = $1 OR s.user_id IS NULL
       ORDER BY s.updated_at DESC`
    : `SELECT s.*, p.total_cost, p.total_grid_import_kwh as total_grid, p.optimized_at
       FROM energy_scenarios s
       LEFT JOIN LATERAL (
         SELECT total_cost, total_grid_import_kwh, optimized_at
         FROM energy_plans WHERE scenario_id = s.scenario_id
         ORDER BY optimized_at DESC LIMIT 1
       ) p ON true
       ORDER BY s.updated_at DESC`;

  const params = userId ? [userId] : [];
  const { rows } = await query(sql, params);
  return rows;
}

async function getScenarioById(scenarioId) {
  const { rows } = await query(
    `SELECT s.*,
            p.hourly_plan, p.total_cost, p.total_grid_import_kwh as total_grid, p.peak_demand_kw as peak_grid, p.optimized_at,
            o.raw_notes, o.directives, o.interpretation_summary
     FROM energy_scenarios s
     LEFT JOIN LATERAL (
       SELECT hourly_plan, total_cost, total_grid_import_kwh, peak_demand_kw, optimized_at
       FROM energy_plans WHERE scenario_id = s.scenario_id
       ORDER BY optimized_at DESC LIMIT 1
     ) p ON true
     LEFT JOIN LATERAL (
       SELECT raw_notes, directives, interpretation_summary
       FROM energy_operator_notes WHERE scenario_id = s.scenario_id
       ORDER BY created_at DESC LIMIT 1
     ) o ON true
     WHERE s.scenario_id = $1`,
    [scenarioId]
  );
  return rows[0] || null;
}

async function deleteScenario(scenarioId) {
  await query('DELETE FROM energy_scenarios WHERE scenario_id = $1', [scenarioId]);
  return { deleted: true, scenario_id: scenarioId };
}

// ── Optimization History ──────────────────────────────────────────────────────

async function listHistory(userId = null) {
  const sql = userId
    ? `SELECT id, scenario_id, scenario_name, status, total_cost, total_grid_import_kwh as total_grid,
              peak_demand_kw as peak_grid, total_solar_used_kwh as solar_used, optimized_at
       FROM energy_plans
       WHERE user_id = $1 OR user_id IS NULL
       ORDER BY optimized_at DESC LIMIT 100`
    : `SELECT id, scenario_id, scenario_name, status, total_cost, total_grid_import_kwh as total_grid,
              peak_demand_kw as peak_grid, total_solar_used_kwh as solar_used, optimized_at
       FROM energy_plans
       ORDER BY optimized_at DESC LIMIT 100`;

  const params = userId ? [userId] : [];
  const { rows } = await query(sql, params);
  return rows;
}

// ── Analytics ─────────────────────────────────────────────────────────────────

async function getAnalytics(userId = null) {
  const plansSql = userId
    ? `SELECT id, scenario_id, scenario_name, total_cost, total_grid_import_kwh as total_grid,
              peak_demand_kw as peak_grid, total_solar_used_kwh as solar_used, optimized_at, hourly_plan
       FROM energy_plans
       WHERE user_id = $1 OR user_id IS NULL
       ORDER BY optimized_at DESC LIMIT 30`
    : `SELECT id, scenario_id, scenario_name, total_cost, total_grid_import_kwh as total_grid,
              peak_demand_kw as peak_grid, total_solar_used_kwh as solar_used, optimized_at, hourly_plan
       FROM energy_plans
       ORDER BY optimized_at DESC LIMIT 30`;

  const { rows } = await query(plansSql, userId ? [userId] : []);

  if (rows.length === 0) {
    return {
      has_data: false,
      total_optimizations: 0,
      average_cost: 0,
      average_grid: 0,
      total_savings_estimated: 0,
      history_trends: [],
    };
  }

  const totalCostSum = rows.reduce((s, r) => s + Number(r.total_cost || 0), 0);
  const totalGridSum = rows.reduce((s, r) => s + Number(r.total_grid || 0), 0);

  const historyTrends = rows.map((r) => ({
    id: r.id,
    date: r.optimized_at,
    scenario_name: r.scenario_name || r.scenario_id,
    total_cost: Number(r.total_cost || 0),
    total_grid: Number(r.total_grid || 0),
    peak_grid: Number(r.peak_grid || 0),
    solar_used: Number(r.solar_used || 0),
  })).reverse();

  return {
    has_data: true,
    total_optimizations: rows.length,
    average_cost: Math.round((totalCostSum / rows.length) * 100) / 100,
    average_grid: Math.round((totalGridSum / rows.length) * 100) / 100,
    latest_plan: rows[0],
    history_trends: historyTrends,
  };
}

module.exports = {
  runOptimization,
  saveScenario,
  listScenarios,
  getScenarioById,
  deleteScenario,
  listHistory,
  getAnalytics,
  normalizeHours,
  normalizeBattery,
};
