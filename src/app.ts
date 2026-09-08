import express, { type Express } from 'express';
import cors from 'cors';
import * as helmetModule from 'helmet';

// helmet 8 publica el mismo default export para ESM (import) y CJS (require),
// pero segun el moduleResolution/interop de cada entorno TypeScript infiere
// tipos distintos para un "import helmet from 'helmet'" (a veces el namespace
// completo, no invocable). Se toma ".default" explicitamente del namespace
// (estable en cualquier resolucion) en vez de depender del default import; el
// cast es redundante en algunos entornos pero necesario en otros (Vercel).
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/consistent-type-imports
const helmet = helmetModule.default as unknown as typeof import('helmet').default;
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
