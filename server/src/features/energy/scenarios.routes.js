/**
 * scenarios.routes.js — Mounted at /scenarios
 */

const { Router } = require('express');
const {
  getScenariosList,
  createScenario,
  getScenario,
  removeScenario,
} = require('./energy.controller');
const { optionalAuth } = require('../../core/auth/auth.middleware');

const router = Router();

router.get('/', optionalAuth, getScenariosList);
router.post('/', optionalAuth, createScenario);
router.get('/:id', optionalAuth, getScenario);
router.delete('/:id', optionalAuth, removeScenario);

module.exports = {
  router,
  prefix: '/scenarios',
};
