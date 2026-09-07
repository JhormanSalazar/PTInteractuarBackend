import type { Request, Response } from 'express';

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    type: 'https://api.local/errors/not-found',
    title: 'Recurso no encontrado',
    status: 404,
    detail: `No existe la ruta ${req.method} ${req.originalUrl}`,
    instance: req.originalUrl,
    traceId: req.traceId,
  });
}
