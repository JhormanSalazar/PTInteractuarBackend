import type { Request, Response } from 'express';
import { AppError } from '../../shared/AppError.js';
import * as repository from './tecnicos.repository.js';
import * as service from './tecnicos.service.js';

export async function list(_req: Request, res: Response): Promise<void> {
  const data = await repository.findAll();
  res.status(200).json({ data });
}

export async function getById(req: Request, res: Response): Promise<void> {
  const { id } = req.validatedParams as { id: number };
  const tecnico = await repository.findById(id);
  if (!tecnico) {
    throw AppError.notFound(`No existe un técnico con id ${id}`);
  }
  res.status(200).json(tecnico);
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { id } = req.validatedParams as { id: number };
  await service.eliminarTecnico(id);
  res.status(204).send();
}
