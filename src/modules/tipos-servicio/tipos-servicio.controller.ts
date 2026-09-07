import type { Request, Response } from 'express';
import { AppError } from '../../shared/AppError.js';
import * as repository from './tipos-servicio.repository.js';

export async function list(_req: Request, res: Response): Promise<void> {
  const data = await repository.findAll();
  res.status(200).json({ data });
}

export async function getById(req: Request, res: Response): Promise<void> {
  const { id } = req.validatedParams as { id: number };
  const tipoServicio = await repository.findById(id);
  if (!tipoServicio) {
    throw AppError.notFound(`No existe un tipo de servicio con id ${id}`);
  }
  res.status(200).json(tipoServicio);
}
