import type { Request, Response } from 'express';
import * as service from './solicitudes.service.js';
import type {
  CreateSolicitudInput,
  ListSolicitudesQuery,
  PatchEstadoInput,
  UpdateSolicitudInput,
} from './solicitudes.schemas.js';

export async function list(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as ListSolicitudesQuery;
  const result = await service.listarSolicitudes(query);
  res.status(200).json(result);
}

export async function getById(req: Request, res: Response): Promise<void> {
  const { id } = req.validatedParams as { id: number };
  const solicitud = await service.obtenerSolicitud(id);
  res.status(200).json(solicitud);
}

export async function create(req: Request, res: Response): Promise<void> {
  const input = req.body as CreateSolicitudInput;
  const creada = await service.crearSolicitud(input);
  res.status(201).location(`/api/v1/solicitudes/${creada.id}`).json(creada);
}

export async function update(req: Request, res: Response): Promise<void> {
  const { id } = req.validatedParams as { id: number };
  const input = req.body as UpdateSolicitudInput;
  const actualizada = await service.actualizarSolicitud(id, input);
  res.status(200).json(actualizada);
}

export async function patchEstado(req: Request, res: Response): Promise<void> {
  const { id } = req.validatedParams as { id: number };
  const input = req.body as PatchEstadoInput;
  const actualizada = await service.cambiarEstado(id, input.estado, input.comentario);
  res.status(200).json(actualizada);
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { id } = req.validatedParams as { id: number };
  await service.eliminarSolicitud(id);
  res.status(204).send();
}
