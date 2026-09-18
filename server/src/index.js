require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const app = require('./core/app');
const { seedAdminIfNeeded } = require('./core/auth/auth.service');

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`⚡ GridWise API running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  try {
    await seedAdminIfNeeded();
  } catch (err) {
    console.error('[auth] Failed to seed admin user:', err.message);
  }
});
