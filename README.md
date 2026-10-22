# Nivaran

Nivaran is an organization-scoped issue-management application with a React/Vite frontend, an Express API, and MongoDB persistence.

## Features

- Account registration, password sign-in, Google sign-in, session logout, and password recovery
- Organization creation and switching, invitations, membership and role management
- Issue creation, status changes, assignment, comments, activity history, and resolution feedback
- Organization activity and analytics views
- In-app notifications
- Private issue attachments with type/size validation and authenticated downloads
- Email invitations for existing and new recipients (recipients can sign in with Google)
- Optional SMTP delivery for invitation and password-reset emails

## Requirements

- Node.js 22 or newer
- npm
- MongoDB Atlas or a local MongoDB instance

## Local setup (Windows PowerShell)

1. Open PowerShell in the project root.
2. Install dependencies:

   ```powershell
   npm install
   npm install --prefix server
   npm install --prefix client
   ```

3. Create the server environment file:

   ```powershell
   Copy-Item server/.env.example server/.env
   ```

4. Edit `server/.env`. Set `MONGODB_URI` to your MongoDB Atlas connection string, and replace `SESSION_SECRET` with a random secret containing at least 32 characters. For Atlas, allow your current IP in Network Access and ensure the database user has the needed permissions. Keep credentials private and never commit `.env`.
5. Start the backend and frontend in separate PowerShell windows from the project root:

   ```powershell
   npm run dev:server
   ```

   ```powershell
   npm run dev:client
   ```

6. Open `http://localhost:5173`. The API liveness endpoint is `http://localhost:5000/api/v1/health`; database readiness is checked at `http://localhost:5000/api/v1/health/ready`.

Alternatively, `npm run dev` starts both development servers together after root dependencies are installed.

## Useful commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start frontend and backend together |
| `npm run test` | Run backend unit tests |
| `npm run test:integration` | Run database-backed API integration tests |
| `npm run verify:db` | Check MongoDB connectivity and core persistence assumptions |
| `npm run build` | Build the frontend for production |
| `npm run check:syntax` | Check backend JavaScript syntax |
| `npm run check:release-config` | Check local environment configuration |
| `npm run verify:full` | Run the release verification gate; requires `TEST_MONGODB_URI` |

For integration and full verification, set `TEST_MONGODB_URI` to a separate disposable test database. Never point tests at production data. In PowerShell, for the current terminal session:

```powershell
$env:TEST_MONGODB_URI = "YOUR_DISPOSABLE_TEST_DATABASE_URI"
npm run verify:full
```

## Environment variables

Required in `server/.env`:

- `MONGODB_URI` — MongoDB connection URI
- `SESSION_SECRET` — random secret, at least 32 characters

Common optional settings are documented in `server/.env.example`: `PORT`, `CLIENT_ORIGIN`, `UPLOAD_DIR`, `CLIENT_URL`, `GOOGLE_CLIENT_ID`, and SMTP settings. For Google sign-in, set `GOOGLE_CLIENT_ID` to the Web OAuth Client ID from Google Cloud Console and keep the authorized JavaScript origin aligned with the frontend URL. The ID is public configuration; do not put a Google Client Secret in the frontend. For production, set `NODE_ENV=production`, use HTTPS, configure the exact deployed frontend origin, and build the frontend with `VITE_API_URL` pointing to the API base URL including `/api/v1`.

## Deployment notes

- `render.yaml` provides a starting point for separate Render API and static frontend services; it still requires your own account and environment values.
- `docker-compose.yml` provides a local container setup. Set `SESSION_SECRET` before starting it.
- The default attachment directory is local disk. Before using ephemeral or multi-instance hosting, configure durable **private** storage and a backup/retention policy.
- Configure SMTP to enable real invitation and password-reset email delivery.
- Do not deploy until database-backed tests, frontend build, manual smoke tests, and CI pass.

## Verification status

This source package has had static checks and limited backend unit tests run during preparation. Full database-backed integration tests, a dependency-backed production frontend build, SMTP delivery, Docker runtime, and deployed browser testing have **not** been confirmed in this environment. Run the verification commands above in your environment before treating the release as ready.

## Project documentation

- [API routes](docs/API.md)
- [Security and operational limits](docs/SECURITY.md)
- [Setup, testing, and release checklist](docs/OPERATIONS.md)


## Password reset and administrator invitations

- The sign-in screen includes **Forgot your password?**. Users can request a single-use password reset link, valid for 30 minutes, sent by email. Reset links are stored as hashes and successful resets invalidate existing sessions.
- Organization admins can invite a person as a **Member**, **Handler**, or **Admin** from the Members page. An invited admin receives the `org_admin` role only after accepting the pending invitation.
- Configure SMTP in `server/.env` for real email delivery. In production, email delivery must be configured; never commit `.env` or share app passwords.
