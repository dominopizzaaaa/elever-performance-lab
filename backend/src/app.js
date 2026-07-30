import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { apiRoutes } from './routes/index.js';
import { attachAuth } from './middleware/auth.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(
    cors({
      origin(origin, callback) {
        // Allow same-origin/server-to-server calls (no Origin header) and the
        // configured kiosk origins.
        if (!origin || env.corsOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`Origin ${origin} is not allowed by CORS`));
      },
      credentials: false,
    }),
  );

  app.use(express.json({ limit: '256kb' }));
  app.use(attachAuth);
  app.use(requestLogger);

  app.use('/api', apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
