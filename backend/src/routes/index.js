import { Router } from 'express';
import { authRoutes } from './authRoutes.js';
import { userRoutes } from './userRoutes.js';
import { sessionRoutes } from './sessionRoutes.js';
import { adminRoutes } from './adminRoutes.js';
import { analyticsRoutes } from './analyticsRoutes.js';
import { libraryRoutes } from './libraryRoutes.js';

export const apiRoutes = Router();

apiRoutes.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'elever-performance-lab-api', time: new Date().toISOString() });
});

apiRoutes.use('/auth', authRoutes);
apiRoutes.use('/users', userRoutes);
apiRoutes.use('/sessions', sessionRoutes);
apiRoutes.use('/admin', adminRoutes);
apiRoutes.use('/analytics', analyticsRoutes);
apiRoutes.use('/library', libraryRoutes);
