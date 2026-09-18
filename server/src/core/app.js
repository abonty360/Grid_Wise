/**
 * app.js — Express application setup
 * Core file: do NOT add feature routes here. Use router.js auto-mounting.
 */

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { errorHandler } = require('./middleware/errorHandler');
const mountRoutes = require('./router');

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Root directory & redirect ──────────────────────────────────────────────
app.get('/', (req, res) => {
  if (req.headers.accept && req.headers.accept.includes('text/html')) {
    return res.redirect('http://localhost:5173');
  }
  return res.json({
    platform: 'GridWise AI Energy Optimization Engine',
    version: '2.0.0',
    status: 'online',
    endpoints: {
      health: 'GET /health',
      optimize_energy: 'POST /optimize-energy (GET /optimize-energy for schema)',
      scenarios: 'GET /scenarios',
      history: 'GET /history',
      analytics: 'GET /analytics',
    },
    web_app: 'http://localhost:5173',
  });
});

// ── Health check (core — returns live service diagnostics) ──────────────────────
const { query } = require('./db');

app.get('/health', async (req, res) => {
  let dbConnected = false;
  try {
    const dbRes = await query('SELECT 1 as live');
    dbConnected = dbRes.rows.length > 0;
  } catch (err) {
    console.warn('[health] Database ping failed:', err.message);
  }

  const llmConfigured = Boolean(
    (process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('your_')) ||
    (process.env.LLM_API_KEY && !process.env.LLM_API_KEY.includes('your_'))
  );

  const activeProvider = process.env.LLM_PROVIDER || (process.env.GEMINI_API_KEY ? 'gemini' : 'openai');

  res.json({
    status: 'ok',
    services: {
      api: 'online',
      database: dbConnected ? 'connected' : 'disconnected',
      optimizer: 'ready',
      llm: llmConfigured ? 'available' : 'placeholder_mode',
    },
    llm_provider: activeProvider,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// ── Auto-mount feature routes ─────────────────────────────────────────────────
mountRoutes(app);

// ── Error handler (must be last) ──────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
