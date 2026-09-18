const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const { Pool } = require('pg');

const isNeonOrRemote = process.env.DATABASE_URL && (process.env.DATABASE_URL.includes('neon.tech') || process.env.DATABASE_URL.includes('sslmode=require'));
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: (process.env.NODE_ENV === 'production' || isNeonOrRemote) ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => {
  console.log('[db] PostgreSQL connected');
});

pool.on('error', (err) => {
  console.error('[db] Unexpected PostgreSQL error:', err.message);
});

/**
 * Execute a parameterized query.
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 */
async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('[db] query executed', { text, duration, rows: res.rowCount });
  return res;
}

/**
 * Get a client from the pool (for transactions).
 */
async function getClient() {
  const client = await pool.connect();
  const originalQuery = client.query.bind(client);
  const originalRelease = client.release.bind(client);

  client.query = (...args) => {
    client.lastQuery = args;
    return originalQuery(...args);
  };

  client.release = () => {
    client.query = originalQuery;
    client.release = originalRelease;
    return originalRelease();
  };

  return client;
}

module.exports = { query, getClient, pool };
