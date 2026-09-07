import { Router } from 'express';
import { idParamsSchema } from '../../shared/idParams.js';
import { validateBody, validateParams, validateQuery } from '../../shared/validate.js';
import { writeLimiter } from '../../middlewares/rateLimit.js';
import * as controller from './solicitudes.controller.js';
import {
  createSolicitudSchema,
  listSolicitudesQuerySchema,
  patchEstadoSchema,
  updateSolicitudSchema,
} from './solicitudes.schemas.js';

export const solicitudesRouter = Router();

solicitudesRouter.get(
  '/solicitudes',
  validateQuery(listSolicitudesQuerySchema),
  controller.list,
);

solicitudesRouter.get(
  '/solicitudes/:id',
  validateParams(idParamsSchema),
  controller.getById,
);

solicitudesRouter.post(
  '/solicitudes',
  writeLimiter,
  validateBody(createSolicitudSchema),
  controller.create,
);

solicitudesRouter.put(
  '/solicitudes/:id',
  writeLimiter,
  validateParams(idParamsSchema),
  validateBody(updateSolicitudSchema),
  controller.update,
);

solicitudesRouter.patch(
  '/solicitudes/:id/estado',
  writeLimiter,
  validateParams(idParamsSchema),
  validateBody(patchEstadoSchema),
  controller.patchEstado,
);

solicitudesRouter.delete(
  '/solicitudes/:id',
  writeLimiter,
  validateParams(idParamsSchema),
  controller.remove,
);
