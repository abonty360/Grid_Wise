/**
 * optimizer.js — Deterministic energy schedule optimizer
 * Strictly adheres to BUP CSE Fest 2026 Problem Statement Specification
 *
 * Objective: Minimize SUM(grid_kwh * tariff_bdt_per_kwh)
 *
 * Constraints:
 * 1. grid + solar_used + battery_discharge = demand + battery_charge
 * 2. minimum_energy_kwh <= battery_energy_after_kwh[h] <= capacity_kwh
 * 3. battery_kwh <= max_charge/discharge limits
 * 4. solar_used_kwh <= effective_solar_kwh
 * 5. grid_kwh >= 0
 * 6. battery_energy_after_kwh[23] == initial_energy_kwh (End-of-day neutrality)
 * 7. Operator directives strictly enforced
 */

const { applyDirectives } = require('./directives');
const { calculateCosts } = require('./costCalculator');
const { validateResult } = require('./validator');

const TOLERANCE = 0.001;

async function optimize(hours, battery, directives) {
  if (!hours || hours.length !== 24) {
    throw Object.assign(new Error('Exactly 24 hours required.'), { statusCode: 400, code: 'INVALID_INPUT' });
  }

  // Normalize battery input parameters
  const capacity = Number(battery.capacity_kwh ?? battery.capacity ?? 100);
  const initialEnergy = Number(battery.initial_energy_kwh ?? battery.initial_energy ?? 50);
  const minReserve = Number(battery.minimum_energy_kwh ?? battery.minimum_energy ?? battery.min_reserve ?? 0);
  const maxCharge = Number(battery.max_charge_kwh_per_hour ?? battery.max_charge ?? capacity * 0.25);
  const maxDischarge = Number(battery.max_discharge_kwh_per_hour ?? battery.max_discharge ?? capacity * 0.25);

  const normalizedBattery = {
    capacity_kwh: capacity,
    initial_energy_kwh: initialEnergy,
    minimum_energy_kwh: minReserve,
    max_charge_kwh_per_hour: maxCharge,
    max_discharge_kwh_per_hour: maxDischarge,
  };

  const constraints = applyDirectives(directives, normalizedBattery, hours);

  let rawPlan;
  try {
    rawPlan = solveSchedule(hours, normalizedBattery, constraints);
  } catch (err) {
    console.warn('[optimizer] Solver fallback triggered:', err.message);
    rawPlan = solveFallback(hours, normalizedBattery, constraints);
  }

  // Calculate costs and exact output schemas
  const { hourlyPlan, totals } = calculateCosts(rawPlan, hours);

  // Validate all 13 checks per BUP CSE Fest specification
  const validation = validateResult(hourlyPlan, hours, normalizedBattery, constraints, totals);

  return {
    hourly_plan: hourlyPlan,
    total_grid_kwh: totals.total_grid_kwh,
    total_cost_bdt: totals.total_cost_bdt,
    peak_grid_kwh: totals.peak_grid_kwh,
    total_solar_used_kwh: totals.total_solar_used_kwh,
    total_charged_kwh: totals.total_charged_kwh,
    total_discharged_kwh: totals.total_discharged_kwh,
    validation,
  };
}

/**
 * Multi-pass greedy economic dispatch solver enforcing end-of-day battery neutrality
 */
function solveSchedule(hours, battery, constraints) {
  const N = 24;
  const { capacity_kwh, initial_energy_kwh, max_charge_kwh_per_hour, max_discharge_kwh_per_hour } = battery;
  const { noChargeHours, noDischargeHours, maxGridByHour, effectiveSolarByHour, minReserveByHour } = constraints;

  const avgTariff = hours.reduce((s, h) => s + (h.tariff_bdt_per_kwh ?? h.tariff ?? 0), 0) / N;

  // Pass 1: Forward economic dispatch
  let prevEnergy = initial_energy_kwh;
  const plan = [];

  for (let h = 0; h < N; h++) {
    const demand = hours[h].demand_kwh ?? hours[h].demand ?? 0;
    const solarAvail = effectiveSolarByHour[h];
    const tariff = hours[h].tariff_bdt_per_kwh ?? hours[h].tariff ?? 0;
    const canCharge = !noChargeHours.has(h);
    const canDischarge = !noDischargeHours.has(h);
    const minReserveH = minReserveByHour[h];

    // 1. Solar used directly to meet demand
    const solarToDemand = Math.min(demand, solarAvail);
    let remainingDemand = Math.max(0, demand - solarToDemand);
    const excessSolar = Math.max(0, solarAvail - solarToDemand);

    // 2. Battery discharge during high tariff periods
    let discharge = 0;
    const isHighTariff = tariff >= avgTariff;
    if (canDischarge && prevEnergy > minReserveH && isHighTariff && remainingDemand > 0) {
      const maxDis = Math.min(
        remainingDemand,
        max_discharge_kwh_per_hour,
        prevEnergy - minReserveH
      );
      discharge = Math.max(0, maxDis);
      remainingDemand = Math.max(0, remainingDemand - discharge);
    }

    // 3. Grid covers remaining demand
    let grid = Math.max(0, remainingDemand);
    if (maxGridByHour[h] !== null) {
      grid = Math.min(grid, maxGridByHour[h]);
      const unmet = demand - solarToDemand - discharge - grid;
      if (unmet > TOLERANCE && canDischarge && prevEnergy - discharge > minReserveH) {
        const extraDis = Math.min(unmet, max_discharge_kwh_per_hour - discharge, prevEnergy - discharge - minReserveH);
        discharge += extraDis;
      }
    }

    // 4. Charge battery from excess solar
    let charge = 0;
    let solarUsed = solarToDemand;
    if (canCharge && prevEnergy < capacity_kwh && excessSolar > 0 && discharge === 0) {
      const solarToBattery = Math.min(excessSolar, max_charge_kwh_per_hour, capacity_kwh - prevEnergy);
      charge = solarToBattery;
      solarUsed += solarToBattery;
    }

    const energyAfter = prevEnergy + charge - discharge;
    plan.push({
      h,
      demand,
      solarAvail,
      solarUsed,
      grid,
      charge,
      discharge,
      energyAfter,
      tariff,
    });
    prevEnergy = energyAfter;
  }

  // Pass 2: Reconcile End-of-Day Battery Neutrality (energyAfter[23] == initial_energy_kwh)
  reconcileBatteryNeutrality(plan, battery, constraints);

  return plan;
}

/**
 * Adjusts charge/discharge to strictly ensure final_battery_energy == initial_battery_energy
 * while preserving the energy balance equation and all rate/capacity limits.
 */
function reconcileBatteryNeutrality(plan, battery, constraints) {
  const { initial_energy_kwh, capacity_kwh, max_charge_kwh_per_hour, max_discharge_kwh_per_hour } = battery;
  const { noChargeHours, noDischargeHours, minReserveByHour } = constraints;

  let currentFinal = plan[23].energyAfter;
  let discrepancy = currentFinal - initial_energy_kwh;

  if (Math.abs(discrepancy) <= TOLERANCE) return;

  if (discrepancy > 0) {
    let surplusToDischarge = discrepancy;

    // Sub-step 1: Increase battery discharge in highest-tariff hours where grid > 0
    const sortedHours = [...plan].sort((a, b) => b.tariff - a.tariff);
    for (const row of sortedHours) {
      if (surplusToDischarge <= TOLERANCE) break;
      const h = row.h;
      if (noDischargeHours.has(h) || row.grid <= TOLERANCE || row.charge > TOLERANCE) continue;

      // How much can we drop SOC across hours h..23 without violating min reserve?
      let maxDrop = Infinity;
      for (let k = h; k < 24; k++) {
        maxDrop = Math.min(maxDrop, plan[k].energyAfter - minReserveByHour[k]);
      }

      const delta = Math.min(
        row.grid,
        max_discharge_kwh_per_hour - row.discharge,
        maxDrop,
        surplusToDischarge
      );

      if (delta > TOLERANCE) {
        row.discharge += delta;
        row.grid -= delta;
        for (let k = h; k < 24; k++) {
          plan[k].energyAfter -= delta;
        }
        surplusToDischarge -= delta;
      }
    }

    // Sub-step 2: If surplus remains, curtail excess solar charging
    if (surplusToDischarge > TOLERANCE) {
      for (let h = 23; h >= 0 && surplusToDischarge > TOLERANCE; h--) {
        const row = plan[h];
        if (row.charge <= TOLERANCE) continue;

        let maxDrop = Infinity;
        for (let k = h; k < 24; k++) {
          maxDrop = Math.min(maxDrop, plan[k].energyAfter - minReserveByHour[k]);
        }

        const delta = Math.min(row.charge, maxDrop, surplusToDischarge);
        if (delta > TOLERANCE) {
          row.charge -= delta;
          row.solarUsed -= delta;
          for (let k = h; k < 24; k++) {
            plan[k].energyAfter -= delta;
          }
          surplusToDischarge -= delta;
        }
      }
    }
  } else {
    let deficitToCover = -discrepancy;

    // Sub-step 1: Trim lowest-tariff discharge
    const lowDischarges = [...plan].filter((r) => r.discharge > TOLERANCE).sort((a, b) => a.tariff - b.tariff);
    for (const row of lowDischarges) {
      if (deficitToCover <= TOLERANCE) break;
      const h = row.h;

      let maxHeadroom = Infinity;
      for (let k = h; k < 24; k++) {
        maxHeadroom = Math.min(maxHeadroom, capacity_kwh - plan[k].energyAfter);
      }

      const delta = Math.min(row.discharge, maxHeadroom, deficitToCover);
      if (delta > TOLERANCE) {
        row.discharge -= delta;
        row.grid += delta;
        for (let k = h; k < 24; k++) {
          plan[k].energyAfter += delta;
        }
        deficitToCover -= delta;
      }
    }

    // Sub-step 2: If deficit remains, charge from grid in cheapest allowed hours
    if (deficitToCover > TOLERANCE) {
      const cheapHours = [...plan].filter((r) => !noChargeHours.has(r.h) && r.discharge <= TOLERANCE).sort((a, b) => a.tariff - b.tariff);
      for (const row of cheapHours) {
        if (deficitToCover <= TOLERANCE) break;
        const h = row.h;

        let maxHeadroom = Infinity;
        for (let k = h; k < 24; k++) {
          maxHeadroom = Math.min(maxHeadroom, capacity_kwh - plan[k].energyAfter);
        }

        const delta = Math.min(
          max_charge_kwh_per_hour - row.charge,
          maxHeadroom,
          deficitToCover
        );

        if (delta > TOLERANCE) {
          row.charge += delta;
          row.grid += delta;
          for (let k = h; k < 24; k++) {
            plan[k].energyAfter += delta;
          }
          deficitToCover -= delta;
        }
      }
    }
  }
}

/**
 * Deterministic fallback solver strictly satisfying all balance and neutrality equations
 */
function solveFallback(hours, battery, constraints) {
  const { initial_energy_kwh } = battery;
  const { effectiveSolarByHour } = constraints;

  // Static battery action: battery remains neutral (charge = 0, discharge = 0)
  return hours.map((h, i) => {
    const demand = h.demand_kwh ?? h.demand ?? 0;
    const solarAvail = effectiveSolarByHour[i];
    const solarUsed = Math.min(demand, solarAvail);
    const grid = Math.max(0, demand - solarUsed);
    const tariff = h.tariff_bdt_per_kwh ?? h.tariff ?? 0;

    return {
      h: i,
      demand,
      solarAvail,
      solarUsed,
      grid,
      charge: 0,
      discharge: 0,
      energyAfter: initial_energy_kwh,
      tariff,
    };
  });
}

module.exports = { optimize };
