import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../shared/AppError.js';
import { env } from '../config/env.js';

const TYPE_BASE = 'https://api.local/errors';

/**
 * body-parser marca sus errores con un `type` propio (entity.parse.failed,
 * entity.too.large, request.aborted...) y un status HTTP 4xx. Se reconocen por
 * esa forma en vez de por instanceof, que obligaria a importar el paquete.
 */
function isBodyParserError(err: unknown): err is Error & { status: number; type: string } {
  if (!(err instanceof Error)) return false;
  const candidate = err as Error & { status?: unknown; type?: unknown };
  return (
    typeof candidate.type === 'string' &&
    candidate.type.includes('.') &&
    typeof candidate.status === 'number' &&
    candidate.status >= 400 &&
    candidate.status < 500
  );
}

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

  // Errores de body-parser (express.json): JSON mal formado, cuerpo que supera
  // el limite de 100kb, charset no soportado... Traen su propio status HTTP y
  // son culpa del cliente, no un fallo interno. Sin esta rama caian en el 500
  // generico de abajo, que ademas oculta el motivo en produccion: un JSON con
  // una coma de mas se reportaba como "Ocurrió un error inesperado".
  if (isBodyParserError(err)) {
    const status = err.status;
    res.status(status).json({
      type: `${TYPE_BASE}/${status === 413 ? 'payload-too-large' : 'invalid-body'}`,
      title:
        status === 413
          ? 'El cuerpo de la petición es demasiado grande'
          : 'El cuerpo de la petición no se pudo leer',
      status,
      detail:
        status === 413
          ? 'El cuerpo de la petición supera el límite permitido de 100kb.'
          : 'Revisa que el cuerpo sea JSON válido y que el encabezado Content-Type sea application/json.',
      instance: req.originalUrl,
      traceId: req.traceId,
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
