/**
 * energy.controller.js — Route handlers for energy features
 */

const { asyncHandler } = require('../../core/middleware/errorHandler');
const {
  runOptimization,
  saveScenario,
  listScenarios,
  getScenarioById,
  deleteScenario,
  listHistory,
  getAnalytics,
} = require('./energy.service');

const optimizeEnergy = asyncHandler(async (req, res) => {
  const userId = req.user?.id || null;
  const result = await runOptimization(req.body, userId);
  res.status(200).json(result);
});

const getScenariosList = asyncHandler(async (req, res) => {
  const userId = req.user?.id || null;
  const scenarios = await listScenarios(userId);
  res.status(200).json({ status: 'success', data: { scenarios } });
});

const createScenario = asyncHandler(async (req, res) => {
  const userId = req.user?.id || null;
  const scenario = await saveScenario(req.body, userId);
  res.status(201).json({ status: 'success', data: { scenario } });
});

const getScenario = asyncHandler(async (req, res) => {
  const scenario = await getScenarioById(req.params.id);
  if (!scenario) {
    return res.status(404).json({
      status: 'error',
      error: { code: 'NOT_FOUND', message: 'Scenario not found.' },
    });
  }
  res.status(200).json({ status: 'success', data: { scenario } });
});

const removeScenario = asyncHandler(async (req, res) => {
  const result = await deleteScenario(req.params.id);
  res.status(200).json({ status: 'success', data: result });
});

const getHistory = asyncHandler(async (req, res) => {
  const userId = req.user?.id || null;
  const history = await listHistory(userId);
  res.status(200).json({ status: 'success', data: { history } });
});

const getAnalyticsHandler = asyncHandler(async (req, res) => {
  const userId = req.user?.id || null;
  const analytics = await getAnalytics(userId);
  res.status(200).json({ status: 'success', data: { analytics } });
});

module.exports = {
  optimizeEnergy,
  getScenariosList,
  createScenario,
  getScenario,
  removeScenario,
  getHistory,
  getAnalyticsHandler,
};
