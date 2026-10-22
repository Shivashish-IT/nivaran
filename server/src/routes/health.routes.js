import { Router } from 'express';
import mongoose from 'mongoose';

const router = Router();

// Liveness: confirms the API process is responding.
router.get('/', (req, res) => res.json({ success: true, data: { status: 'ok', service: 'nivaran-api' } }));

// Readiness: used by hosting platforms to avoid routing traffic before MongoDB is connected.
router.get('/ready', (req, res) => {
  const databaseReady = mongoose.connection.readyState === 1;
  res.status(databaseReady ? 200 : 503).json({
    success: databaseReady,
    data: { status: databaseReady ? 'ready' : 'not_ready', database: databaseReady ? 'connected' : 'disconnected' },
  });
});

export default router;
