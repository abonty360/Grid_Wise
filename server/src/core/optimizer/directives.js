/**
 * directives.js — Apply LLM directives to produce optimizer constraint matrices
 * Adheres strictly to the BUP CSE Fest 2026 Problem Statement.
 */

function applyDirectives(directives, battery, hours) {
  const noChargeHours = new Set();
  const noDischargeHours = new Set();
  const maxGridByHour = new Array(24).fill(null); // null = unlimited
  const solarFactorByHour = new Array(24).fill(1.0);
  const minReserveByHour = new Array(24).fill(battery.minimum_energy_kwh ?? battery.min_reserve ?? 0);
  let globalMinReserve = battery.minimum_energy_kwh ?? battery.min_reserve ?? 0;

  for (const d of (directives || [])) {
    if (!d.applies || !d.structured_adjustment) continue;

    switch (d.directive_type) {
      case 'solar_reduction': {
        const factor = d.structured_adjustment.factor ?? 1.0;
        const targetHours = d.structured_adjustment.hours?.length > 0
          ? d.structured_adjustment.hours
          : Array.from({ length: 24 }, (_, i) => i);
        targetHours.forEach((h) => {
          if (h >= 0 && h < 24) solarFactorByHour[h] *= factor;
        });
        break;
      }

      case 'minimum_battery_reserve': {
        const reserve = d.structured_adjustment.minimum_energy_kwh ?? d.structured_adjustment.reserve_kwh ?? 0;
        const targetHours = d.structured_adjustment.hours?.length > 0
          ? d.structured_adjustment.hours
          : Array.from({ length: 24 }, (_, i) => i);
        targetHours.forEach((h) => {
          if (h >= 0 && h < 24) {
            minReserveByHour[h] = Math.max(minReserveByHour[h], reserve);
          }
        });
        globalMinReserve = Math.max(globalMinReserve, reserve);
        break;
      }

      case 'no_charge_window': {
        const targetHours = d.structured_adjustment.hours || [];
        targetHours.forEach((h) => {
          if (h >= 0 && h < 24) noChargeHours.add(h);
        });
        break;
      }

      case 'no_discharge_window': {
        const targetHours = d.structured_adjustment.hours || [];
        targetHours.forEach((h) => {
          if (h >= 0 && h < 24) noDischargeHours.add(h);
        });
        break;
      }

      case 'max_grid_window': {
        const maxKwh = d.structured_adjustment.max_grid_kwh ?? Infinity;
        const targetHours = d.structured_adjustment.hours || [];
        targetHours.forEach((h) => {
          if (h >= 0 && h < 24) {
            if (maxGridByHour[h] === null) maxGridByHour[h] = maxKwh;
            else maxGridByHour[h] = Math.min(maxGridByHour[h], maxKwh);
          }
        });
        break;
      }

      case 'no_op':
      default:
        break;
    }
  }

  // Calculate effective solar
  const effectiveSolarByHour = (hours || []).map((h, i) =>
    Math.max(0, (h.solar_kwh ?? h.solar ?? 0) * solarFactorByHour[i])
  );

  return {
    noChargeHours,
    noDischargeHours,
    maxGridByHour,
    solarFactorByHour,
    minReserveByHour,
    minReserve: globalMinReserve,
    effectiveSolarByHour,
    rawDirectives: directives,
  };
}

module.exports = { applyDirectives };
