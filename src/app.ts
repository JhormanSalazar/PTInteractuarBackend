import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
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
import { demoRouter } from './modules/demo/demo.routes.js';
import { notFoundHandler } from './middlewares/notFound.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { requestContext } from './middlewares/requestContext.js';
import { globalLimiter } from './middlewares/rateLimit.js';

const parseJson = express.json({ limit: '100kb' });

/**
 * Envoltura sobre express.json().
 *
 * El runtime serverless de Vercel puede consumir el stream de la peticion por
 * su cuenta y dejar el body ya deserializado en req.body antes de que Express
 * vea nada. Cuando eso pasa, body-parser se queda esperando datos de un stream
 * que ya termino y acaba lanzando un error ("request aborted"), que subia al
 * errorHandler como error no anticipado y salia al cliente como un 500 opaco.
 * En la practica se traducia en que POST y PUT fallaban en produccion mientras
 * GET y PATCH funcionaban, sin ninguna pista en la respuesta.
 *
 * Si el body ya viene parseado no hay nada que parsear: se sigue de largo.
 */
function jsonBodyParser(req: Request, res: Response, next: NextFunction): void {
  if (req.body !== undefined && req.body !== null) {
    next();
    return;
  }
  parseJson(req, res, next);
}

/**
 * Construye la aplicacion Express sin escuchar en ningun puerto. Separarla de
 * server.ts permite que Supertest la monte directamente en los tests de
 * integracion y que Vercel la use como funcion serverless (exporta el default).
 */
export function createApp(): Express {
  const app = express();

  // Configuración requerida para entornos cloud / serverless como Vercel
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // requestContext va PRIMERO, antes incluso de helmet y del parseo del body.
  // Antes estaba despues de express.json() y eso dejaba un agujero real: si el
  // parseo del body fallaba, el error subia al errorHandler con req.traceId
  // todavia sin asignar, asi que la respuesta 500 salia sin traceId y sin
  // cabeceras de rate limit — justo el caso mas dificil de diagnosticar en
  // produccion, y sin nada con que buscarlo en los logs.
  app.use(requestContext);
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(jsonBodyParser);
  app.use(globalLimiter);

  mountSwagger(app);

  app.use('/api/v1', healthRouter);
  app.use('/api/v1', solicitudesRouter);
  app.use('/api/v1', tecnicosRouter);
  app.use('/api/v1', tiposServicioRouter);

  // El endpoint de reset solo existe cuando la demo esta activa. Montarlo de
  // forma condicional (en vez de comprobar el flag dentro del handler) hace que
  // con DEMO_MODE=false caiga en notFoundHandler y devuelva exactamente el
  // mismo 404 que cualquier ruta inexistente, sin delatar que la ruta existe.
  if (env.DEMO_MODE) {
    app.use('/api/v1', demoRouter);
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

const app = createApp();

export default app;
