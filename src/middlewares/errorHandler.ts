import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../shared/AppError.js';
import { env } from '../config/env.js';

const TYPE_BASE = 'https://api.local/errors';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.status).json({
      type: err.type,
      title: err.title,
      status: err.status,
      detail: err.detail,
      instance: req.originalUrl,
      traceId: req.traceId,
      ...(err.errors ? { errors: err.errors } : {}),
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      type: `${TYPE_BASE}/validation-error`,
      title: 'Los datos enviados no son válidos',
      status: 400,
      detail: 'Revise los campos indicados',
      instance: req.originalUrl,
      traceId: req.traceId,
      errors: err.issues.map((issue) => ({
        field: issue.path.join('.') || '(raíz)',
        message: issue.message,
      })),
    });
    return;
  }

  // Error no anticipado: se registra completo en el log (con el traceId para
  // poder buscarlo) pero nunca se filtra el detalle interno al cliente en produccion.
  console.error(`[traceId=${req.traceId}]`, err);

  res.status(500).json({
    type: `${TYPE_BASE}/internal-error`,
    title:
      env.NODE_ENV === 'production'
        ? 'Ocurrió un error inesperado'
        : err instanceof Error
          ? err.message
          : 'Ocurrió un error inesperado',
    status: 500,
    instance: req.originalUrl,
    traceId: req.traceId,
  });
}
