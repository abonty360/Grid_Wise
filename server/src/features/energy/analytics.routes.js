/**
 * analytics.routes.js — Mounted at /analytics
 */

const { Router } = require('express');
const { getAnalyticsHandler } = require('./energy.controller');
const { optionalAuth } = require('../../core/auth/auth.middleware');

const router = Router();

router.get('/', optionalAuth, getAnalyticsHandler);

module.exports = {
  router,
  prefix: '/analytics',
};
