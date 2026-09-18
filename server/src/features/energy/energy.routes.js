/**
 * energy.routes.js — Mounted at /optimize-energy
 */

const { Router } = require('express');
const { validateOptimizeEnergy } = require('./energy.validation');
const { optimizeEnergy } = require('./energy.controller');
const { optionalAuth } = require('../../core/auth/auth.middleware');

const router = Router();

// GET /optimize-energy — Returns API schema info for API clients, or redirects browsers to web UI
router.get('/', (req, res) => {
  const acceptsHtml = req.headers.accept && req.headers.accept.includes('text/html');

  if (acceptsHtml) {
    // If accessed via a web browser, redirect to the interactive UI page
    return res.redirect('http://localhost:5173/energy/new');
  }

  return res.status(200).json({
    status: 'ok',
    endpoint: '/optimize-energy',
    method: 'POST',
    description: 'GridWise AI Energy Optimization Engine (BUP CSE Fest 2026)',
    instruction: 'Send a POST request with scenario_id, operator_notes (1-3 strings), 24 hours, and battery specifications.',
    web_ui: 'http://localhost:5173/energy/new',
    sample_request: {
      scenario_id: 'sample-scenario-01',
      operator_notes: [
        'Do not charge battery between 2 PM and 4 PM',
        'Keep at least 25 kWh in battery as reserve'
      ],
      battery: {
        capacity_kwh: 100,
        initial_energy_kwh: 50,
        minimum_energy_kwh: 20,
        max_charge_kwh_per_hour: 25,
        max_discharge_kwh_per_hour: 25
      },
      hours: [
        { hour: 0, demand_kwh: 50.0, solar_kwh: 0.0, tariff_bdt_per_kwh: 7.5 }
      ]
    }
  });
});

// POST /optimize-energy
router.post('/', optionalAuth, validateOptimizeEnergy, optimizeEnergy);

module.exports = {
  router,
  prefix: '/optimize-energy',
};
