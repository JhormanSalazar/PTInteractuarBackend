import { Router } from 'express';
import { idParamsSchema } from '../../shared/idParams.js';
import { validateParams } from '../../shared/validate.js';
import { writeLimiter } from '../../middlewares/rateLimit.js';
import * as controller from './tecnicos.controller.js';

export const tecnicosRouter = Router();

tecnicosRouter.get('/tecnicos', controller.list);
tecnicosRouter.get('/tecnicos/:id', validateParams(idParamsSchema), controller.getById);
// No forma parte del catalogo de solo lectura del contrato original, pero es
// necesaria para poder verificar la regla de negocio "no se puede eliminar un
// tecnico con solicitudes asociadas -> 409" (ver reporte de este bloque).
tecnicosRouter.delete(
  '/tecnicos/:id',
  writeLimiter,
  validateParams(idParamsSchema),
  controller.remove,
);
