/**
 * auth.service.js — JWT authentication service
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { query } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'gridwise-secret';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '7d';

// ── Password ──────────────────────────────────────────────────────────────────
async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// ── Token ─────────────────────────────────────────────────────────────────────
function generateToken(userId, role) {
  return jwt.sign({ sub: userId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// ── User operations ───────────────────────────────────────────────────────────
async function createUser({ email, password, name, role = 'user' }) {
  const existing = await query('SELECT id FROM users WHERE email=$1', [email]);
  if (existing.rows.length > 0) {
    throw Object.assign(new Error('Email already registered.'), { statusCode: 409, code: 'EMAIL_TAKEN' });
  }
  const hash = await hashPassword(password);
  const { rows } = await query(
    'INSERT INTO users (email, password_hash, name, role) VALUES ($1,$2,$3,$4) RETURNING id, email, name, role, created_at',
    [email, hash, name, role]
  );
  return rows[0];
}

async function findUserByEmail(email) {
  const { rows } = await query('SELECT * FROM users WHERE email=$1', [email]);
  return rows[0] || null;
}

async function findUserById(id) {
  const { rows } = await query('SELECT id, email, name, role, created_at FROM users WHERE id=$1', [id]);
  return rows[0] || null;
}

async function getAllUsers() {
  const { rows } = await query('SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC', []);
  return rows;
}

async function updateUserRole(userId, role) {
  const { rows } = await query('UPDATE users SET role=$1 WHERE id=$2 RETURNING id, email, name, role', [role, userId]);
  return rows[0];
}

async function login(email, password) {
  const user = await findUserByEmail(email);
  if (!user) throw Object.assign(new Error('Invalid credentials.'), { statusCode: 401 });
  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) throw Object.assign(new Error('Invalid credentials.'), { statusCode: 401 });
  const token = generateToken(user.id, user.role);
  return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
}

async function seedAdminIfNeeded() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@gridwise.io';
  const adminPassword = process.env.ADMIN_PASSWORD || 'GridWise2026!';
  const existing = await findUserByEmail(adminEmail);
  if (!existing) {
    await createUser({ email: adminEmail, password: adminPassword, name: 'Admin', role: 'admin' });
    console.log('[auth] Admin user seeded:', adminEmail);
  }
}

module.exports = { createUser, findUserById, findUserByEmail, getAllUsers, updateUserRole, login, generateToken, verifyToken, seedAdminIfNeeded };
