const mode = process.argv[2] || 'local';
const production = mode === 'production';
if (!['local', 'production'].includes(mode)) {
  console.error('Usage: node scripts/check-release-config.js [local|production]');
  process.exit(2);
}

const problems = [];
const value = (name) => (process.env[name] || '').trim();
const isUrl = (raw) => {
  try { const url = new URL(raw); return ['http:', 'https:'].includes(url.protocol); }
  catch { return false; }
};

if (production) {
  for (const name of ['MONGODB_URI', 'SESSION_SECRET', 'CLIENT_ORIGIN', 'VITE_API_URL']) {
    if (!value(name)) problems.push(`${name} is required for production release configuration.`);
  }
  if (value('SESSION_SECRET').length < 32) problems.push('SESSION_SECRET must contain at least 32 characters.');
  if (value('CLIENT_ORIGIN') && (!isUrl(value('CLIENT_ORIGIN')) || value('CLIENT_ORIGIN').includes('localhost'))) {
    problems.push('CLIENT_ORIGIN must be the deployed frontend origin (http/https), not localhost.');
  }
  if (value('VITE_API_URL') && (!isUrl(value('VITE_API_URL')) || value('VITE_API_URL').includes('localhost'))) {
    problems.push('VITE_API_URL must be the deployed API base URL (including /api/v1), not localhost.');
  }
  if (value('MONGODB_URI').startsWith('mongodb://127.0.0.1') || value('MONGODB_URI').startsWith('mongodb://localhost')) {
    problems.push('MONGODB_URI points to localhost; this is usually not reachable from a hosted service.');
  }
} else {
  if (!value('MONGODB_URI')) problems.push('MONGODB_URI is missing. Copy server/.env.example to server/.env and configure it.');
  if (value('SESSION_SECRET').length < 32) problems.push('SESSION_SECRET should be at least 32 characters, even in local development.');
  if (!value('CLIENT_ORIGIN')) console.warn('NOTE: CLIENT_ORIGIN is unset; the app currently defaults to http://localhost:5173.');
}

if (problems.length) {
  console.error(`Release configuration check (${mode}) found ${problems.length} issue(s):`);
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}
console.log(`Release configuration check (${mode}) passed basic presence/format checks.`);
console.log('This does not verify database connectivity, email delivery, browser behavior, or deployment health.');
