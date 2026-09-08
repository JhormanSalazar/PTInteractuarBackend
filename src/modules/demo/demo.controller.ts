import type { Request, Response } from 'express';
import * as service from './demo.service.js';

export async function reset(_req: Request, res: Response): Promise<void> {
  const result = await service.resetDemoData();
  res.status(200).json({
    mensaje: 'Datos de demostración restaurados.',
    ...result,
  });
}
