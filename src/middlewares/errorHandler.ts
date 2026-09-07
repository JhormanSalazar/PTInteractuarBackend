import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';

/**
 * Red de seguridad generica. El formato de error completo estilo RFC 9457
 * (con traceId, type, instance) se construye en el bloque del CRUD; aqui solo
 * se evita que un error no controlado filtre el stack trace al cliente.
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  console.error(err);

  const message =
    env.NODE_ENV === 'production'
      ? 'Ocurrio un error inesperado'
      : err instanceof Error
        ? err.message
        : 'Ocurrio un error inesperado';

  res.status(500).json({
    status: 500,
    title: message,
  });
}
