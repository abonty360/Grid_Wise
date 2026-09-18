/**
 * optimizer.test.js — Unit test suite strictly verifying BUP CSE Fest 2026 Problem Statement
 */

const assert = require('assert');
const { optimize } = require('../src/core/optimizer/optimizer');
const { applyDirectives } = require('../src/core/optimizer/directives');
const { calculateBaseline } = require('../src/core/optimizer/costCalculator');

async function runTests() {
  console.log('🧪 Starting GridWise BUP CSE Fest 2026 Verification Tests...\n');

  // Test 1: 24-Hour Input Data per BUP CSE Fest 2026 Schema
  const testHours = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    demand_kwh: Math.round((55 + 35 * Math.sin((Math.PI * i) / 12)) * 10) / 10,
    solar_kwh: i >= 6 && i <= 18 ? Math.round((65 * Math.sin((Math.PI * (i - 6)) / 12)) * 10) / 10 : 0,
    tariff_bdt_per_kwh: i >= 17 && i <= 21 ? 15.0 : 7.5,
  }));

  const testBattery = {
    capacity_kwh: 100,
    initial_energy_kwh: 50,
    minimum_energy_kwh: 20,
    max_charge_kwh_per_hour: 25,
    max_discharge_kwh_per_hour: 25,
    efficiency: 1.0,
  };

  // Test 2: Baseline Calculation
  const baseline = calculateBaseline(testHours);
  assert(baseline.total_grid_kwh > 0, 'Baseline grid must be > 0');
  assert(baseline.total_cost_bdt > 0, 'Baseline cost must be > 0');
  console.log(`  ✓ Baseline calculation verified: ${baseline.total_cost_bdt} BDT (grid: ${baseline.total_grid_kwh} kWh)`);

  // Test 3: Exact BUP Directive Schemas
  const testDirectives = [
    {
      note_index: 0,
      applies: true,
      directive_type: 'no_charge_window',
      structured_adjustment: { hours: [14, 15] },
      explanation: 'No charging allowed between 2 PM and 4 PM (hours 14, 15)',
    },
    {
      note_index: 1,
      applies: true,
      directive_type: 'minimum_battery_reserve',
      structured_adjustment: { hours: Array.from({ length: 24 }, (_, h) => h), minimum_energy_kwh: 25 },
      explanation: 'Maintain battery reserve above 25 kWh',
    },
    {
      note_index: 2,
      applies: true,
      directive_type: 'solar_reduction',
      structured_adjustment: { hours: Array.from({ length: 24 }, (_, h) => h), factor: 0.9 },
      explanation: 'Reduce solar by 10%',
    },
  ];

  const constraints = applyDirectives(testDirectives, testBattery, testHours);
  assert(constraints.noChargeHours.has(14), 'Hour 14 must be in no-charge window');
  assert(constraints.noChargeHours.has(15), 'Hour 15 must be in no-charge window');
  assert(!constraints.noChargeHours.has(16), 'Hour 16 must NOT be in no-charge window');
  assert.strictEqual(constraints.minReserve, 25, 'Effective min reserve must be 25 kWh');
  console.log('  ✓ Directive translation and constraint application verified');

  // Test 4: Optimization without directives achieves cost reduction vs baseline
  const pureOpt = await optimize(testHours, testBattery, []);
  assert(pureOpt.total_cost_bdt <= baseline.total_cost_bdt, `Optimized cost (${pureOpt.total_cost_bdt}) must be <= baseline (${baseline.total_cost_bdt})`);
  console.log(`  ✓ Unconstrained optimizer reduced cost: ${baseline.total_cost_bdt} BDT -> ${pureOpt.total_cost_bdt} BDT`);

  // Test 5: Optimization with BUP Directives & Constraint Enforcement
  const optResult = await optimize(testHours, testBattery, testDirectives);
  assert.strictEqual(optResult.hourly_plan.length, 24, 'Optimized plan must contain exactly 24 hours');

  // Verify BUP hourly plan fields
  const firstHour = optResult.hourly_plan[0];
  assert('hour' in firstHour, 'Must contain hour');
  assert('grid_kwh' in firstHour, 'Must contain grid_kwh');
  assert('solar_used_kwh' in firstHour, 'Must contain solar_used_kwh');
  assert('battery_action' in firstHour, 'Must contain battery_action');
  assert('battery_kwh' in firstHour, 'Must contain battery_kwh');
  assert('battery_energy_after_kwh' in firstHour, 'Must contain battery_energy_after_kwh');
  console.log('  ✓ Hourly plan schema contains all required BUP fields');

  // Verify Energy Balance Rule: grid + solar_used + battery_discharge = demand + battery_charge
  for (const r of optResult.hourly_plan) {
    const charge = r.battery_action === 'charge' ? r.battery_kwh : 0;
    const discharge = r.battery_action === 'discharge' ? r.battery_kwh : 0;
    const lhs = r.grid_kwh + r.solar_used_kwh + discharge;
    const rhs = r.demand_kwh + charge;
    assert(Math.abs(lhs - rhs) <= 0.05, `Balance violated at hour ${r.hour}: ${lhs} != ${rhs}`);
  }
  console.log('  ✓ Energy balance equation (grid + solar_used + discharge = demand + charge) verified for all 24 hours');

  // Verify End-of-Day Battery Neutrality: final battery energy == initial battery energy
  const finalEnergy = optResult.hourly_plan[23].battery_energy_after_kwh;
  assert(Math.abs(finalEnergy - testBattery.initial_energy_kwh) <= 0.05,
    `Neutrality violated: final (${finalEnergy}) != initial (${testBattery.initial_energy_kwh})`
  );
  console.log(`  ✓ End-of-day battery neutrality verified: final (${finalEnergy} kWh) == initial (${testBattery.initial_energy_kwh} kWh)`);

  // Verify Directives Replay: no charging at hours 14 and 15
  assert(optResult.hourly_plan[14].battery_action !== 'charge', 'Charging must be prohibited at hour 14');
  assert(optResult.hourly_plan[15].battery_action !== 'charge', 'Charging must be prohibited at hour 15');

  // Verify Minimum Reserve: battery >= 25 kWh
  const minBat = Math.min(...optResult.hourly_plan.map((h) => h.battery_energy_after_kwh));
  assert(minBat >= 24.95, `Battery energy (${minBat}) dropped below 25 kWh reserve`);
  console.log('  ✓ Directives replayed and verified on schedule');

  // Verify All 13 Validation Checks pass
  assert.strictEqual(optResult.validation.all_pass, true, 'All 13 validation checks must pass');
  assert.strictEqual(optResult.validation.checks.length, 13, 'Must perform exactly 13 checks');
  console.log('  ✓ 13-point schedule validation passed completely');

  console.log('\n🎉 ALL BUP CSE FEST 2026 TESTS PASSED SUCCESSFULLY!\n');
}

runTests().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
