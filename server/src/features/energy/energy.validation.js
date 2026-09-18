/**
 * energy.validation.js — Zod schema for POST /optimize-energy
 * Aligned with BUP CSE Fest 2026 Problem Statement Specification
 */

const { z } = require('zod');

const HourSchema = z.preprocess((val) => {
  if (typeof val !== 'object' || val === null) return val;
  return {
    hour: val.hour !== undefined ? Number(val.hour) : undefined,
    demand_kwh: Number(val.demand_kwh ?? val.demand ?? 0),
    solar_kwh: Number(val.solar_kwh ?? val.solar ?? 0),
    tariff_bdt_per_kwh: Number(val.tariff_bdt_per_kwh ?? val.tariff ?? val.grid_price_per_kwh ?? 0),
  };
}, z.object({
  hour: z.number().int().min(0).max(23),
  demand_kwh: z.number().min(0),
  solar_kwh: z.number().min(0),
  tariff_bdt_per_kwh: z.number().min(0),
}));

const BatterySchema = z.preprocess((val) => {
  if (typeof val !== 'object' || val === null) return val;
  const capacity = Number(val.capacity_kwh ?? val.capacity ?? 0);
  const initial_energy = Number(val.initial_energy_kwh ?? val.initial_energy ?? val.current_charge_kwh ?? 0);
  const minimum_energy = Number(val.minimum_energy_kwh ?? val.minimum_energy ?? val.min_reserve ?? 0);
  const max_charge = Number(val.max_charge_kwh_per_hour ?? val.max_charge ?? val.max_charge_rate_kw ?? 0);
  const max_discharge = Number(val.max_discharge_kwh_per_hour ?? val.max_discharge ?? val.max_discharge_rate_kw ?? 0);
  const efficiency = Number(val.efficiency ?? 1.0);

  return {
    capacity_kwh: capacity,
    initial_energy_kwh: initial_energy,
    minimum_energy_kwh: minimum_energy,
    max_charge_kwh_per_hour: max_charge,
    max_discharge_kwh_per_hour: max_discharge,
    efficiency,
  };
}, z.object({
  capacity_kwh: z.number().positive('capacity_kwh must be > 0'),
  initial_energy_kwh: z.number().min(0, 'initial_energy_kwh must be >= 0'),
  minimum_energy_kwh: z.number().min(0, 'minimum_energy_kwh must be >= 0'),
  max_charge_kwh_per_hour: z.number().positive('max_charge_kwh_per_hour must be > 0'),
  max_discharge_kwh_per_hour: z.number().positive('max_discharge_kwh_per_hour must be > 0'),
  efficiency: z.number().min(0).max(1).default(1.0),
}).refine((b) => b.initial_energy_kwh <= b.capacity_kwh, {
  message: 'initial_energy_kwh must be <= capacity_kwh',
  path: ['initial_energy_kwh'],
}).refine((b) => b.minimum_energy_kwh <= b.capacity_kwh, {
  message: 'minimum_energy_kwh must be <= capacity_kwh',
  path: ['minimum_energy_kwh'],
}).refine((b) => b.initial_energy_kwh >= b.minimum_energy_kwh, {
  message: 'initial_energy_kwh must be >= minimum_energy_kwh',
  path: ['initial_energy_kwh'],
}));

const OptimizeSchema = z.object({
  scenario_id: z.string().min(1).optional(),
  scenario_name: z.string().min(1).max(100).optional().default('Energy Scenario'),
  description: z.string().max(500).optional().default(''),
  operator_notes: z.array(z.string().min(1)).min(1, '1–3 operator notes required').max(3, 'At most 3 operator notes allowed'),
  hours: z.array(HourSchema).length(24, 'Exactly 24 hours required (hours 0 to 23)'),
  battery: BatterySchema,
}).refine(
  (d) => new Set(d.hours.map((h) => h.hour)).size === 24,
  { message: 'Hours must be unique and span all hours from 0 to 23', path: ['hours'] }
);

function validateOptimizeEnergy(req, res, next) {
  const result = OptimizeSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      status: 'error',
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed according to BUP CSE Fest 2026 specification.',
        details: result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      },
    });
  }
  req.body = result.data;
  next();
}

module.exports = { validateOptimizeEnergy, OptimizeSchema, HourSchema, BatterySchema };
