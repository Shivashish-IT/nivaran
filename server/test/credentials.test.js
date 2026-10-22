import test from 'node:test';
import assert from 'node:assert/strict';
import { createSessionToken, hashSessionToken, hashPassword, verifyPassword } from '../src/utils/credentials.js';

test('session tokens are URL-safe and have cryptographic entropy', () => {
  const first = createSessionToken();
  const second = createSessionToken();
  assert.match(first, /^[A-Za-z0-9_-]{40,50}$/);
  assert.notEqual(first, second);
});

test('session token hashes are deterministic and do not expose the token', () => {
  const token = createSessionToken();
  const digest = hashSessionToken(token);
  assert.match(digest, /^[a-f0-9]{64}$/);
  assert.equal(hashSessionToken(token), digest);
  assert.notEqual(digest, token);
});

test('password hashes verify only the matching password', async () => {
  const stored = await hashPassword('a-long-test-password');
  assert.match(stored, /^scrypt\$/);
  assert.equal(await verifyPassword('a-long-test-password', stored), true);
  assert.equal(await verifyPassword('a-different-password', stored), false);
  assert.equal(await verifyPassword('anything', 'invalid-format'), false);
});
