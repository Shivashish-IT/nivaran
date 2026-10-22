import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import organizationRoutes from './routes/organizations.routes.js';
import issueRoutes from './routes/issues.routes.js';
import notificationRoutes from './routes/notifications.routes.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

const app = express();
app.disable('x-powered-by');
// Render and similar hosts terminate TLS in front of Node; trust one proxy hop in production
// so secure cookies and rate-limit client IP handling work as expected.
if (env.nodeEnv === 'production') app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: env.clientOrigin, credentials: true }));
// Session cookies are SameSite=None on separate production origins. Reject cross-origin
// browser mutations explicitly; non-browser clients without an Origin header remain usable.
app.use((req, res, next) => {
  const isMutation = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
  const origin = req.get('origin');
  if (isMutation && origin && origin !== env.clientOrigin) {
    return res.status(403).json({ success: false, error: { code: 'ORIGIN_FORBIDDEN', message: 'This request origin is not allowed.' } });
  }
  next();
});
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false }));

app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/organizations', organizationRoutes);
app.use('/api/v1/issues', issueRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
