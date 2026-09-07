import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';

/**
 * Asigna un traceId por peticion (visible en la respuesta via X-Trace-Id y en
 * todo Problem Details) y deja un log de una linea al terminar la respuesta,
 * para poder correlacionar un error reportado por un usuario con el log del
 * servidor.
 */
export function requestContext(req: Request, res: Response, next: NextFunction): void {
  req.traceId = randomUUID();
  res.setHeader('X-Trace-Id', req.traceId);

  if (env.LOG_LEVEL !== 'silent') {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      console.log(
        `[${req.traceId}] ${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(1)}ms`,
      );
    });
  }

  next();
}
