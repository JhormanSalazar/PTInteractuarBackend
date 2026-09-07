import type { Request, Response } from 'express';

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    status: 404,
    title: 'Recurso no encontrado',
    detail: `No existe la ruta ${req.method} ${req.originalUrl}`,
  });
}
