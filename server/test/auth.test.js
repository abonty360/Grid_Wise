/**
 * auth.test.js — Verification test suite for JWT token implementation and session expiry
 */

const assert = require('assert');
const jwt = require('jsonwebtoken');
const {
  generateTokens,
  generateToken,
  verifyToken,
  verifyRefreshToken,
  getSessionDetails,
} = require('../src/core/auth/auth.service');
const { authenticate } = require('../src/core/auth/auth.middleware');

async function runAuthTests() {
  console.log('🧪 Starting GridWise JWT & Session Expiry Tests...\n');

  const mockUser = {
    id: '11111111-2222-3333-4444-555555555555',
    email: 'operator@gridwise.io',
    name: 'Operator One',
    role: 'user',
  };

  // ── Test 1: Dual Token Generation ───────────────────────────────────────────
  const tokens = generateTokens(mockUser);
  assert(tokens.token, 'Access token must be generated');
  assert(tokens.refreshToken, 'Refresh token must be generated');
  assert(typeof tokens.expiresIn === 'number' && tokens.expiresIn > 0, 'expiresIn must be positive number');
  assert(tokens.expiresAt, 'expiresAt ISO string must be returned');
  assert(tokens.refreshExpiresAt, 'refreshExpiresAt ISO string must be returned');
  console.log(`  ✓ Dual token generation verified: access token expires in ${tokens.expiresIn}s`);

  // ── Test 2: Access Token Verification ───────────────────────────────────────
  const verifiedAccess = verifyToken(tokens.token);
  assert.strictEqual(verifiedAccess.sub, mockUser.id, 'User ID in payload must match');
  assert.strictEqual(verifiedAccess.type, 'access', 'Token type must be access');
  assert.strictEqual(verifiedAccess.role, mockUser.role, 'Role in payload must match');
  console.log('  ✓ Valid access token verification passed');

  // ── Test 3: Type Segregation ────────────────────────────────────────────────
  // Refresh token should not be accepted as an access token
  assert.throws(
    () => verifyToken(tokens.refreshToken),
    (err) => err.code === 'INVALID_TOKEN_TYPE' || err.name === 'JsonWebTokenError',
    'Refresh token must not be accepted by verifyToken'
  );

  // Access token should not be accepted as a refresh token
  assert.throws(
    () => verifyRefreshToken(tokens.token),
    (err) => err.code === 'INVALID_TOKEN_TYPE' || err.name === 'JsonWebTokenError',
    'Access token must not be accepted by verifyRefreshToken'
  );
  console.log('  ✓ Token type segregation verified (access vs refresh)');

  // ── Test 4: Session Details & Remaining Lifetime ────────────────────────────
  const session = getSessionDetails(tokens.token);
  assert(session, 'Session details must be extracted from valid token');
  assert.strictEqual(session.userId, mockUser.id, 'Session user ID matches');
  assert.strictEqual(session.isExpired, false, 'Fresh token must not be expired');
  assert(session.expiresInSeconds > 0, 'Remaining lifetime must be > 0');
  console.log(`  ✓ Session inspection verified: ${session.expiresInSeconds}s remaining`);

  // ── Test 5: Session Expiry Detection (Expired Token) ────────────────────────
  const secret = process.env.JWT_SECRET || 'gridwise-secret';
  // Create an already-expired token (expired 5 seconds ago)
  const expiredToken = jwt.sign(
    { sub: mockUser.id, role: mockUser.role, type: 'access' },
    secret,
    { expiresIn: '-5s' }
  );

  let caughtExpired = false;
  try {
    verifyToken(expiredToken);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      caughtExpired = true;
    }
  }
  assert(caughtExpired, 'verifyToken must throw TokenExpiredError for expired token');

  const expiredSession = getSessionDetails(expiredToken);
  assert.strictEqual(expiredSession.isExpired, true, 'getSessionDetails must mark expired token as isExpired: true');
  assert.strictEqual(expiredSession.expiresInSeconds, 0, 'Remaining lifetime must be 0s for expired token');
  console.log('  ✓ Token expiry detected and accurately reported as expired');

  // ── Test 6: Middleware Response on Session Expiry ───────────────────────────
  let statusReceived = null;
  let jsonReceived = null;
  const mockReq = {
    headers: {
      authorization: `Bearer ${expiredToken}`,
    },
  };
  const mockRes = {
    status(code) {
      statusReceived = code;
      return this;
    },
    json(data) {
      jsonReceived = data;
      return this;
    },
  };
  let nextCalled = false;

  await authenticate(mockReq, mockRes, () => {
    nextCalled = true;
  });

  assert.strictEqual(nextCalled, false, 'Expired token must not proceed to next()');
  assert.strictEqual(statusReceived, 401, 'Expired token must return HTTP 401');
  assert.strictEqual(jsonReceived?.error?.code, 'TOKEN_EXPIRED', 'Error code must be TOKEN_EXPIRED');
  console.log('  ✓ Middleware correctly returns HTTP 401 TOKEN_EXPIRED on expired token');

  // ── Test 7: Middleware Response on Malformed / Tampered Token ────────────────
  const tamperedReq = {
    headers: {
      authorization: 'Bearer invalid.tampered.token',
    },
  };
  statusReceived = null;
  jsonReceived = null;
  nextCalled = false;

  await authenticate(tamperedReq, mockRes, () => {
    nextCalled = true;
  });

  assert.strictEqual(nextCalled, false, 'Tampered token must not proceed');
  assert.strictEqual(statusReceived, 401, 'Tampered token must return HTTP 401');
  assert.strictEqual(jsonReceived?.error?.code, 'INVALID_TOKEN', 'Error code must be INVALID_TOKEN');
  console.log('  ✓ Middleware correctly returns HTTP 401 INVALID_TOKEN on tampered token');

  // ── Test 8: Middleware Response on Missing Token ────────────────────────────
  const missingReq = { headers: {} };
  statusReceived = null;
  jsonReceived = null;
  nextCalled = false;

  await authenticate(missingReq, mockRes, () => {
    nextCalled = true;
  });

  assert.strictEqual(nextCalled, false, 'Missing token must not proceed');
  assert.strictEqual(statusReceived, 401, 'Missing token must return HTTP 401');
  assert.strictEqual(jsonReceived?.error?.code, 'UNAUTHORIZED', 'Error code must be UNAUTHORIZED');
  console.log('  ✓ Middleware correctly returns HTTP 401 UNAUTHORIZED when header missing');

  console.log('\n🎉 ALL JWT & SESSION EXPIRY TESTS PASSED SUCCESSFULLY!\n');
}

runAuthTests().catch((err) => {
  console.error('❌ Auth test failure:', err);
  process.exit(1);
});
