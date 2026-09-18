/**
 * auth.controller.js — Handlers for authentication & admin user management
 */

const { asyncHandler } = require('../../core/middleware/errorHandler');
const {
  createUser,
  login,
  getAllUsers,
  updateUserRole,
  findUserById,
} = require('../../core/auth/auth.service');

const register = asyncHandler(async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({
      status: 'error',
      error: { code: 'VALIDATION_ERROR', message: 'Name, email, and password are required.' },
    });
  }

  const user = await createUser({ email, password, name, role: 'user' });
  const loginRes = await login(email, password);
  res.status(201).json({
    status: 'success',
    data: loginRes,
  });
});

const loginHandler = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({
      status: 'error',
      error: { code: 'VALIDATION_ERROR', message: 'Email and password are required.' },
    });
  }

  const result = await login(email, password);
  res.status(200).json({
    status: 'success',
    data: result,
  });
});

const getMe = asyncHandler(async (req, res) => {
  const user = await findUserById(req.user.id);
  res.status(200).json({
    status: 'success',
    data: { user },
  });
});

const listUsers = asyncHandler(async (req, res) => {
  const users = await getAllUsers();
  res.status(200).json({
    status: 'success',
    data: { users },
  });
});

const changeRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({
      status: 'error',
      error: { code: 'INVALID_ROLE', message: 'Role must be user or admin.' },
    });
  }

  const updated = await updateUserRole(req.params.id, role);
  res.status(200).json({
    status: 'success',
    data: { user: updated },
  });
});

module.exports = { register, loginHandler, getMe, listUsers, changeRole };
