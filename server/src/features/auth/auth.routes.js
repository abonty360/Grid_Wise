/**
 * auth.routes.js — Auto-mounted at /auth
 */

const { Router } = require('express');
const { register, loginHandler, getMe, listUsers, changeRole } = require('./auth.controller');
const { authenticate, requireAdmin } = require('../../core/auth/auth.middleware');

const router = Router();

router.post('/register', register);
router.post('/login', loginHandler);
router.get('/me', authenticate, getMe);

// Admin user management routes
router.get('/admin/users', authenticate, requireAdmin, listUsers);
router.put('/admin/users/:id/role', authenticate, requireAdmin, changeRole);

module.exports = {
  router,
  prefix: '/auth',
};
