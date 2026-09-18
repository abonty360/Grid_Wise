/**
 * energy.helpers.js — Utility functions for the energy feature
 */

export const defaultBattery = {
  capacity_kwh: 100,
  current_charge_kwh: 50,
  max_charge_rate_kw: 25,
  max_discharge_rate_kw: 25,
  efficiency: 0.92,
};

/**
 * Generate realistic default 24-hour energy data.
 * Uses a simple sinusoidal demand curve + solar bell curve.
 */
export function generateDefaultHours() {
  return Array.from({ length: 24 }, (_, i) => {
    const hour = i;
    // Demand: peaks at 18:00 (~200kW), low at 03:00 (~80kW)
    const demand = 80 + 120 * Math.pow(Math.sin((Math.PI * (hour - 6)) / 12), 2);
    // Solar: bell curve peaking at 12:00
    const solar =
      hour >= 6 && hour <= 19
        ? 80 * Math.sin((Math.PI * (hour - 6)) / 13)
        : 0;
    // Price: higher during evening peak
    const price =
      hour >= 17 && hour <= 21 ? 0.28 : hour >= 7 && hour <= 16 ? 0.15 : 0.08;
    // Wind: slight variation for realism
    const wind = 10 + 20 * Math.sin((Math.PI * hour) / 12 + 1);

    return {
      hour,
      demand_kw: Math.round(demand * 100) / 100,
      solar_kw: Math.round(solar * 100) / 100,
      grid_price_per_kwh: price,
      wind_kw: Math.round(wind * 100) / 100,
    };
  });
}
