import { rateLimit } from 'express-rate-limit';
import type { Request, Response } from 'express';
import { env } from '../config/env.js';

function tooManyRequests(req: Request, res: Response): void {
  res.status(429).json({
    type: 'https://api.local/errors/rate-limited',
    title: 'Demasiadas peticiones',
    status: 429,
    detail: 'Se superó el límite de peticiones permitido. Intenta de nuevo en unos minutos.',
    instance: req.originalUrl,
    traceId: req.traceId,
  });
}

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooManyRequests,
});

/** Límite más estricto para escrituras (POST/PUT/PATCH/DELETE): un endpoint
 * público sin límites separados invita a que alguien vacíe o llene la tabla. */
export const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.RATE_LIMIT_WRITE_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooManyRequests,
});

/** Límite propio y mucho más estricto para POST /demo/reset. Ese endpoint no
 * lleva token (el botón que lo llama vive en un bundle público), así que el
 * rate limit es, junto con DEMO_MODE, la única barrera real: restaurar la demo
 * es una acción puntual, nadie necesita hacerla más de un puñado de veces por
 * ventana, y así no se puede usar para machacar la base de datos. */
export const demoLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.RATE_LIMIT_DEMO_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooManyRequests,
});
