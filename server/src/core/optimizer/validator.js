/**
 * validator.js — 13-point mathematical schedule validator
 * Strictly adheres to the BUP CSE Fest 2026 Problem Statement Specification
 */

const TOLERANCE = 0.05;

function validateResult(hourlyPlan, hours, battery, constraints, totals) {
  const checks = [];
  const add = (check, pass, description) =>
    checks.push({ check, status: pass ? 'pass' : 'fail', description });

  const { capacity_kwh, initial_energy_kwh, max_charge_kwh_per_hour, max_discharge_kwh_per_hour } = battery;
  const { minReserveByHour, effectiveSolarByHour, rawDirectives } = constraints;

  // 1. Exactly 24 hour records
  add('24 hour records', hourlyPlan.length === 24, `Found ${hourlyPlan.length} records.`);

  // 2. Hour range valid (0–23)
  const validHours = hourlyPlan.every((r, i) => r.hour === i);
  add('Hour range valid', validHours, validHours ? 'Hours 0–23 present sequentially.' : 'Invalid hour sequence.');

  // 3. No duplicate hours
  const uniqueHours = new Set(hourlyPlan.map((r) => r.hour)).size === 24;
  add('No duplicate hours', uniqueHours, uniqueHours ? 'All hours unique.' : 'Duplicate hours detected.');

  // 4. Energy balance: grid + solar_used + battery_discharge = demand + battery_charge
  let balanceOk = true;
  let balanceMsg = 'Energy balance satisfied for all 24 hours.';
  for (const r of hourlyPlan) {
    const charge = r.battery_action === 'charge' ? r.battery_kwh : 0;
    const discharge = r.battery_action === 'discharge' ? r.battery_kwh : 0;
    const lhs = r.grid_kwh + r.solar_used_kwh + discharge;
    const rhs = r.demand_kwh + charge;

    if (Math.abs(lhs - rhs) > TOLERANCE) {
      balanceOk = false;
      balanceMsg = `Energy balance failed at hour ${r.hour}: grid(${r.grid_kwh}) + solar(${r.solar_used_kwh}) + discharge(${discharge}) != demand(${r.demand_kwh}) + charge(${charge})`;
      break;
    }
  }
  add('Energy balance valid', balanceOk, balanceMsg);

  // 5. Solar usage <= effective solar
  let solarOk = true;
  for (let i = 0; i < 24; i++) {
    if (hourlyPlan[i].solar_used_kwh > effectiveSolarByHour[i] + TOLERANCE) {
      solarOk = false;
      break;
    }
  }
  add('Solar limit valid', solarOk, solarOk ? 'Solar used <= effective solar available at all hours.' : 'Solar overuse detected.');

  // 6. Battery capacity not exceeded
  const capOk = hourlyPlan.every((r) => r.battery_energy_after_kwh <= capacity_kwh + TOLERANCE);
  add('Battery capacity valid', capOk, capOk ? `Battery stayed within capacity (${capacity_kwh} kWh).` : 'Battery capacity exceeded.');

  // 7. Minimum battery reserve maintained
  let reserveOk = true;
  for (let i = 0; i < 24; i++) {
    if (hourlyPlan[i].battery_energy_after_kwh < minReserveByHour[i] - TOLERANCE) {
      reserveOk = false;
      break;
    }
  }
  add('Minimum reserve valid', reserveOk, reserveOk ? 'Minimum battery energy reserve maintained across all hours.' : 'Minimum battery reserve violated.');

  // 8. Max charge rate limit respected
  const chargeRateOk = hourlyPlan.every((r) =>
    r.battery_action !== 'charge' || r.battery_kwh <= max_charge_kwh_per_hour + TOLERANCE
  );
  add('Charge rate valid', chargeRateOk, chargeRateOk ? `Charge rate <= ${max_charge_kwh_per_hour} kWh/h.` : 'Max charge rate exceeded.');

  // 9. Max discharge rate limit respected
  const dischargeRateOk = hourlyPlan.every((r) =>
    r.battery_action !== 'discharge' || r.battery_kwh <= max_discharge_kwh_per_hour + TOLERANCE
  );
  add('Discharge rate valid', dischargeRateOk, dischargeRateOk ? `Discharge rate <= ${max_discharge_kwh_per_hour} kWh/h.` : 'Max discharge rate exceeded.');

  // 10. Non-negative grid import
  const nonNegGrid = hourlyPlan.every((r) => r.grid_kwh >= -TOLERANCE);
  add('Grid non-negative', nonNegGrid, nonNegGrid ? 'Grid import >= 0 at all hours.' : 'Negative grid import detected.');

  // 11. Final battery energy == Initial battery energy (BUP Requirement)
  const finalEnergy = hourlyPlan[23].battery_energy_after_kwh;
  const neutralityOk = Math.abs(finalEnergy - initial_energy_kwh) <= TOLERANCE;
  add('End-of-day battery neutrality', neutralityOk, neutralityOk
    ? `Final battery energy (${finalEnergy.toFixed(2)} kWh) equals initial energy (${initial_energy_kwh.toFixed(2)} kWh).`
    : `Neutrality breached: Final (${finalEnergy.toFixed(2)} kWh) != Initial (${initial_energy_kwh.toFixed(2)} kWh).`
  );

  // 12. Replay Operator Directives Against Final Plan
  let directivesOk = true;
  let directiveMsg = 'All operator directives strictly enforced.';
  for (const d of (rawDirectives || [])) {
    if (!d.applies || !d.structured_adjustment) continue;

    if (d.directive_type === 'no_charge_window') {
      const hours = d.structured_adjustment.hours || [];
      const violated = hours.some((h) => hourlyPlan[h].battery_action === 'charge');
      if (violated) {
        directivesOk = false;
        directiveMsg = `no_charge_window violated during hours [${hours.join(', ')}].`;
        break;
      }
    }

    if (d.directive_type === 'no_discharge_window') {
      const hours = d.structured_adjustment.hours || [];
      const violated = hours.some((h) => hourlyPlan[h].battery_action === 'discharge');
      if (violated) {
        directivesOk = false;
        directiveMsg = `no_discharge_window violated during hours [${hours.join(', ')}].`;
        break;
      }
    }

    if (d.directive_type === 'max_grid_window') {
      const hours = d.structured_adjustment.hours || [];
      const maxKwh = d.structured_adjustment.max_grid_kwh;
      const violated = hours.some((h) => hourlyPlan[h].grid_kwh > maxKwh + TOLERANCE);
      if (violated) {
        directivesOk = false;
        directiveMsg = `max_grid_window violated during hours [${hours.join(', ')}].`;
        break;
      }
    }
  }
  add('Directives satisfied', directivesOk, directiveMsg);

  // 13. All totals & metrics recalculated and verified
  const recTotalGrid = hourlyPlan.reduce((s, r) => s + r.grid_kwh, 0);
  const recTotalCost = hourlyPlan.reduce((s, r) => s + r.grid_kwh * r.tariff_bdt_per_kwh, 0);
  const recPeakGrid = Math.max(...hourlyPlan.map((r) => r.grid_kwh));

  const totalsOk =
    Math.abs(recTotalGrid - totals.total_grid_kwh) < 0.1 &&
    Math.abs(recTotalCost - totals.total_cost_bdt) < 0.1 &&
    Math.abs(recPeakGrid - totals.peak_grid_kwh) < 0.1;

  add('Totals verified', totalsOk, totalsOk ? 'total_grid_kwh, total_cost_bdt, and peak_grid_kwh recalculated and verified.' : 'Discrepancy in recalculated totals.');

  const allPass = checks.every((c) => c.status === 'pass');
  return { checks, all_pass: allPass };
}

module.exports = { validateResult };
