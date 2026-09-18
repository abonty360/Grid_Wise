/**
 * auth.middleware.js — JWT verification middleware
 */

const { verifyToken, findUserById } = require('./auth.service');

async function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'error', error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
  }
  try {
    const token = auth.slice(7);
    const payload = verifyToken(token);
    const user = await findUserById(payload.sub);
    if (!user) return res.status(401).json({ status: 'error', error: { code: 'UNAUTHORIZED', message: 'User not found.' } });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ status: 'error', error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token.' } });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ status: 'error', error: { code: 'FORBIDDEN', message: 'Admin access required.' } });
  }
  next();
}

// Optional auth — attaches user if token present, doesn't fail if missing
async function optionalAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return next();
  try {
    const token = auth.slice(7);
    const payload = verifyToken(token);
    const user = await findUserById(payload.sub);
    if (user) req.user = user;
  } catch {
    // Ignore invalid tokens in optional mode
  }
  next();
}

module.exports = { authenticate, requireAdmin, optionalAuth };
