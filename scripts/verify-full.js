import { spawnSync } from 'node:child_process';

const required = ['TEST_MONGODB_URI'];
const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length) {
  console.error(`Full verification requires: ${missing.join(', ')}.`);
  console.error('Use a dedicated disposable MongoDB database. Do not point tests at production data.');
  process.exit(2);
}

const commands = [
  ['Backend syntax', 'npm', ['run', 'check:syntax', '--prefix', 'server']],
  ['Backend unit tests', 'npm', ['test', '--prefix', 'server']],
  ['Database integration tests', 'npm', ['run', 'test:integration', '--prefix', 'server']],
  ['Frontend production build', 'npm', ['run', 'build', '--prefix', 'client']],
];

for (const [label, command, args] of commands) {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync(command, args, { stdio: 'inherit', env: process.env, shell: process.platform === 'win32' });
  if (result.error) {
    console.error(`${label} could not start: ${result.error.message}`);
    process.exit(result.status ?? 1);
  }
  if (result.status !== 0) {
    console.error(`${label} failed with exit code ${result.status ?? 'unknown'}.`);
    process.exit(result.status ?? 1);
  }
}

console.log('\nAll configured verification steps completed successfully.');
