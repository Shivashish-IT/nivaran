# Operations and release checklist

## Local setup

1. Install Node.js 22+ and npm.
2. Install root, server, and client dependencies (`npm install`, `npm install --prefix server`, `npm install --prefix client`).
3. Copy `server/.env.example` to `server/.env`.
4. Set `MONGODB_URI` to a development MongoDB database and set a random `SESSION_SECRET` of at least 32 characters.
5. Run `npm run dev:server` and `npm run dev:client` in separate terminals, or run `npm run dev` from the root after installing root dependencies.
6. Open `http://localhost:5173` and check `/api/v1/health` and `/api/v1/health/ready` on the API host.

## Automated verification

Use a separate disposable test database and set `TEST_MONGODB_URI` before running:

```powershell
$env:TEST_MONGODB_URI = "YOUR_DISPOSABLE_TEST_DATABASE_URI"
npm run verify:full
```

The full gate checks backend syntax, unit tests, API integration tests, and the frontend production build. A skipped integration test is not a release pass.

Additional checks:

```powershell
npm run verify:db
npm run test
npm run test:integration
npm run build
npm run check:release-config
```

## Manual smoke test

- Register a test user and sign in/out.
- Create an organization and verify organization switching.
- Invite a member; check role restrictions and invitation acceptance.
- Create an issue, assign it, add a comment, change status, and verify activity/notifications.
- Upload and download an allowed attachment; verify unauthorized users cannot download it.
- Submit resolution feedback as the reporter and confirm duplicate/unauthorized submissions are rejected.
- Test password-reset requests and a valid/expired/reused token. Confirm real email delivery only after SMTP is configured.
- Run the tenant-isolation test described in `SECURITY.md`.

## Before production

- [ ] Full verification gate passes without skipped required tests.
- [ ] GitHub CI passes on the release commit.
- [ ] Production MongoDB, session secret, frontend origin, and API URL are configured.
- [ ] SMTP is configured and email delivery is tested.
- [ ] Durable private attachment storage and backups/retention are configured.
- [ ] HTTPS and correct cookie/origin behavior are confirmed.
- [ ] Browser smoke tests pass against the deployed URL.
- [ ] A rollback and database backup/restore plan exists.

The included Render and Docker configurations are starting points, not proof that the service has been deployed or verified.
