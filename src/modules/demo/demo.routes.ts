import { Router } from 'express';
import { demoLimiter } from '../../middlewares/rateLimit.js';
import * as controller from './demo.controller.js';

/**
 * Router del modo demostracion. app.ts solo lo monta cuando DEMO_MODE=true; con
 * la variable en false la ruta ni siquiera existe y cae en notFoundHandler, que
 * responde el mismo 404 que cualquier otra ruta inexistente.
 *
 * No lleva token en cabecera a proposito: el unico cliente que lo invoca es el
 * boton del bundle de Angular, que es publico y descargable, asi que un token
 * ahi seria visible para cualquiera y solo aparentaria seguridad. La proteccion
 * real es la combinacion de DEMO_MODE y el rate limit estricto de abajo.
 */
export const demoRouter = Router();

demoRouter.post('/demo/reset', demoLimiter, controller.reset);
