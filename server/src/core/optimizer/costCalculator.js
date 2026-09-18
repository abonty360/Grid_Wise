/**
 * costCalculator.js — Format hourly plan and totals according to BUP CSE Fest 2026 schema
 */

const TOLERANCE = 0.001;

function calculateCosts(rawPlan, hours) {
  let totalGrid = 0;
  let totalCost = 0;
  let peakGrid = 0;
  let totalSolarUsed = 0;
  let totalCharged = 0;
  let totalDischarged = 0;

  const hourlyPlan = rawPlan.map((row) => {
    const cost = row.grid * row.tariff;
    totalGrid += row.grid;
    totalCost += cost;
    peakGrid = Math.max(peakGrid, row.grid);
    totalSolarUsed += row.solarUsed;
    totalCharged += row.charge;
    totalDischarged += row.discharge;

    // Determine battery action and battery_kwh
    let batteryAction = 'idle';
    let batteryKwh = 0;

    if (row.charge > TOLERANCE) {
      batteryAction = 'charge';
      batteryKwh = round(row.charge);
    } else if (row.discharge > TOLERANCE) {
      batteryAction = 'discharge';
      batteryKwh = round(row.discharge);
    }

    return {
      // Required by BUP CSE Fest 2026 Problem Statement:
      hour: row.h,
      grid_kwh: round(row.grid),
      solar_used_kwh: round(row.solarUsed),
      battery_action: batteryAction,
      battery_kwh: batteryKwh,
      battery_energy_after_kwh: round(row.energyAfter),

      // Additional UI & contextual fields (backward compatible):
      demand_kwh: round(row.demand),
      solar_kwh: round(row.solarAvail),
      tariff_bdt_per_kwh: round(row.tariff),
      cost_bdt: round(cost),
      charge_kwh: round(row.charge),
      discharge_kwh: round(row.discharge),
      battery_energy_kwh: round(row.energyAfter),
    };
  });

  return {
    hourlyPlan,
    totals: {
      total_grid_kwh: round(totalGrid),
      total_cost_bdt: round(totalCost),
      peak_grid_kwh: round(peakGrid),
      total_solar_used_kwh: round(totalSolarUsed),
      total_charged_kwh: round(totalCharged),
      total_discharged_kwh: round(totalDischarged),
    },
  };
}

function calculateBaseline(hours) {
  let totalGrid = 0;
  let totalCost = 0;
  let peakGrid = 0;

  for (const h of hours) {
    const demand = h.demand_kwh ?? h.demand ?? 0;
    const solar = h.solar_kwh ?? h.solar ?? 0;
    const tariff = h.tariff_bdt_per_kwh ?? h.tariff ?? 0;

    const grid = Math.max(0, demand - solar);
    const cost = grid * tariff;
    totalGrid += grid;
    totalCost += cost;
    peakGrid = Math.max(peakGrid, grid);
  }

  return {
    total_grid_kwh: round(totalGrid),
    total_cost_bdt: round(totalCost),
    peak_grid_kwh: round(peakGrid),
  };
}

function round(val, decimals = 4) {
  return Math.round(val * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

module.exports = { calculateCosts, calculateBaseline, round };
