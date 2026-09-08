import express, { type Express } from 'express';
import cors from 'cors';
// helmet declara su "types" fuera del mapa "exports" (solo import/require ahi
// dentro); bajo moduleResolution NodeNext eso resuelve de forma inconsistente
// segun el entorno -- funcionaba en local pero en el build de Vercel (Linux)
// TypeScript resolvia el namespace completo en vez del default exportado
// ("This expression is not callable"). El import-interop de CJS evita la
// ambiguedad de raiz en vez de depender de la resolucion del default de ESM.
import helmet = require('helmet');
import { env } from './config/env.js';
import { mountSwagger } from './docs/swagger.js';
import { healthRouter } from './modules/health/health.routes.js';
import { solicitudesRouter } from './modules/solicitudes/solicitudes.routes.js';
import { tecnicosRouter } from './modules/tecnicos/tecnicos.routes.js';
import { tiposServicioRouter } from './modules/tipos-servicio/tipos-servicio.routes.js';
import { notFoundHandler } from './middlewares/notFound.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { requestContext } from './middlewares/requestContext.js';
import { globalLimiter } from './middlewares/rateLimit.js';

/**
 * Construye la aplicacion Express sin escuchar en ningun puerto. Separarla de
 * server.ts permite que Supertest la monte directamente en los tests de
 * integracion y que Vercel la use como funcion serverless (exporta el default).
 */
export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json({ limit: '100kb' }));
  app.use(requestContext);
  app.use(globalLimiter);

  mountSwagger(app);

  app.use('/api/v1', healthRouter);
  app.use('/api/v1', solicitudesRouter);
  app.use('/api/v1', tecnicosRouter);
  app.use('/api/v1', tiposServicioRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

const app = createApp();

export default app;
