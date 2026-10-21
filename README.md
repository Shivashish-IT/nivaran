# Nivaran

Nivaran is a React/Vite frontend and Express/MongoDB backend for organization-scoped issue management.

## Repository status

The Nivaran Stage 6 project source has **not yet been uploaded to this repository**. The repository currently contains this README only, so it cannot be deployed yet. Download the Stage 6 source archive from the project conversation, extract it, and copy the *contents* of its inner `nivaran/` folder into this repository root. The root should contain `client/`, `server/`, `render.yaml`, `docker-compose.yml`, and `package.json`.

## Quick start (after source files are uploaded)

1. Install Node.js 22+ and MongoDB, or use MongoDB Atlas.
2. Copy `server/.env.example` to `server/.env` and configure `MONGODB_URI` and a random `SESSION_SECRET` (at least 32 characters).
3. In one terminal run `npm install --prefix server && npm run dev --prefix server`.
4. In another terminal run `npm install --prefix client && npm run dev --prefix client`.
5. Open the URL Vite prints (usually `http://localhost:5173`).

## Docker quick start

Set a strong `SESSION_SECRET`, then run `docker compose up --build`. Open `http://localhost:8080`.

## Database verification

- `npm run verify:db` checks MongoDB connectivity and selected persistence/tenant-isolation invariants.
- With a dedicated test database, run `cd server && npm install` then `TEST_MONGODB_URI="mongodb://127.0.0.1:27017/nivaran_test" npm run test:integration`.
- `/api/v1/health` is the liveness endpoint. `/api/v1/health/ready` checks database readiness.

## Deployment

The included `render.yaml` blueprint requires a MongoDB Atlas connection string, deployed frontend origin, and frontend API URL configured in Render environment settings. Never commit secrets.

## Verification status

Static syntax/configuration checks have been performed on the source archive, but live MongoDB connectivity, the production frontend build, Docker runtime, and deployed end-to-end testing are not yet verified.
