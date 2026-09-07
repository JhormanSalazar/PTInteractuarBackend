import { Router } from 'express';
import { checkDatabaseConnection } from '../../config/db.js';

export const healthRouter = Router();

healthRouter.get('/health', async (_req, res) => {
  const databaseUp = await checkDatabaseConnection();

  res.status(databaseUp ? 200 : 503).json({
    status: databaseUp ? 'ok' : 'degraded',
    database: databaseUp ? 'ok' : 'error',
    timestamp: new Date().toISOString(),
  });
});
