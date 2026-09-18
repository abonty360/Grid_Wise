/**
 * history.routes.js — Mounted at /history
 */

const { Router } = require('express');
const { getHistory } = require('./energy.controller');
const { optionalAuth } = require('../../core/auth/auth.middleware');

const router = Router();

router.get('/', optionalAuth, getHistory);

module.exports = {
  router,
  prefix: '/history',
};
