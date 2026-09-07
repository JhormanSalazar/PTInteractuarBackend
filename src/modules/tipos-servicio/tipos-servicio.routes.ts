import { Router } from 'express';
import { idParamsSchema } from '../../shared/idParams.js';
import { validateParams } from '../../shared/validate.js';
import * as controller from './tipos-servicio.controller.js';

export const tiposServicioRouter = Router();

tiposServicioRouter.get('/tipos-servicio', controller.list);
tiposServicioRouter.get('/tipos-servicio/:id', validateParams(idParamsSchema), controller.getById);
