import { AppError } from '../../shared/AppError.js';
import { buildPaginationMeta, type PaginationMeta } from '../../shared/pagination.js';
import * as tecnicosRepository from '../tecnicos/tecnicos.repository.js';
import * as tiposServicioRepository from '../tipos-servicio/tipos-servicio.repository.js';
import * as repository from './solicitudes.repository.js';
import type { SolicitudResponse } from './solicitudes.repository.js';
import type {
  CreateSolicitudInput,
  Estado,
  ListSolicitudesQuery,
  UpdateSolicitudInput,
} from './solicitudes.schemas.js';

const ESTADOS_QUE_REQUIEREN_TECNICO: Estado[] = ['ASIGNADA', 'EN_PROCESO'];

/** Regla de negocio pura, sin acceso a datos: se prueba con un test unitario. */
export function requiereTecnicoAsignado(estado: Estado): boolean {
  return ESTADOS_QUE_REQUIEREN_TECNICO.includes(estado);
}

async function assertReferenciasExisten(tipoServicioId: number, tecnicoId: number | null | undefined) {
  const tipoServicio = await tiposServicioRepository.findById(tipoServicioId);
  if (!tipoServicio) {
    throw AppError.unprocessable(`No existe un tipo de servicio con id ${tipoServicioId}`, [
      { field: 'tipoServicioId', message: 'No existe un tipo de servicio con ese id' },
    ]);
  }

  if (tecnicoId != null) {
    const tecnico = await tecnicosRepository.findById(tecnicoId);
    if (!tecnico) {
      throw AppError.unprocessable(`No existe un técnico con id ${tecnicoId}`, [
        { field: 'tecnicoId', message: 'No existe un técnico con ese id' },
      ]);
    }
  }
}

export async function listarSolicitudes(
  query: ListSolicitudesQuery,
): Promise<{ data: SolicitudResponse[]; meta: PaginationMeta }> {
  const { rows, total } = await repository.findMany(
    {
      q: query.q,
      estado: query.estado,
      prioridad: query.prioridad,
      tecnicoId: query.tecnicoId,
      tipoServicioId: query.tipoServicioId,
    },
    query.page,
    query.pageSize,
    query.sort,
  );

  return { data: rows, meta: buildPaginationMeta(query.page, query.pageSize, total) };
}

export async function obtenerSolicitud(id: number): Promise<SolicitudResponse> {
  const solicitud = await repository.findById(id);
  if (!solicitud) {
    throw AppError.notFound(`No existe una solicitud con id ${id}`);
  }
  return solicitud;
}

// Creacion: siempre nace PENDIENTE, incluso si ya trae un tecnico sugerido
// (el contrato no expone "estado" en el body de creacion). Si el cliente
// quiere que quede ASIGNADA de una vez, hace un PATCH /estado despues.
export async function crearSolicitud(input: CreateSolicitudInput): Promise<SolicitudResponse> {
  await assertReferenciasExisten(input.tipoServicioId, input.tecnicoId);

  const creada = await repository.create({
    titulo: input.titulo,
    descripcion: input.descripcion ?? null,
    solicitanteNombre: input.solicitanteNombre,
    tecnicoId: input.tecnicoId ?? null,
    tipoServicioId: input.tipoServicioId,
    prioridad: input.prioridad,
    fechaLimite: input.fechaLimite ?? null,
  });

  await repository.insertHistorial({
    solicitudId: creada.id,
    estadoAnterior: null,
    estadoNuevo: 'PENDIENTE',
    tecnicoIdAnterior: null,
    tecnicoIdNuevo: input.tecnicoId ?? null,
    comentario: 'Creación de la solicitud',
  });

  return creada;
}

export async function actualizarSolicitud(
  id: number,
  input: UpdateSolicitudInput,
): Promise<SolicitudResponse> {
  const actual = await repository.findById(id);
  if (!actual) {
    throw AppError.notFound(`No existe una solicitud con id ${id}`);
  }

  await assertReferenciasExisten(input.tipoServicioId, input.tecnicoId);

  if (input.tecnicoId === null && requiereTecnicoAsignado(actual.estado)) {
    throw AppError.conflict(
      `No se puede quitar el técnico de una solicitud en estado ${actual.estado}; cambia primero su estado.`,
    );
  }

  const actualizada = await repository.update(id, {
    titulo: input.titulo,
    descripcion: input.descripcion,
    solicitanteNombre: input.solicitanteNombre,
    tecnicoId: input.tecnicoId,
    tipoServicioId: input.tipoServicioId,
    prioridad: input.prioridad,
    fechaLimite: input.fechaLimite,
  });
  if (!actualizada) {
    throw AppError.notFound(`No existe una solicitud con id ${id}`);
  }

  if (actual.tecnico?.id !== (input.tecnicoId ?? undefined)) {
    await repository.insertHistorial({
      solicitudId: id,
      estadoAnterior: actual.estado,
      estadoNuevo: actualizada.estado,
      tecnicoIdAnterior: actual.tecnico?.id ?? null,
      tecnicoIdNuevo: input.tecnicoId,
      comentario: 'Actualización de la solicitud',
    });
  }

  return actualizada;
}

export async function cambiarEstado(
  id: number,
  estado: Estado,
  comentario?: string | null,
): Promise<SolicitudResponse> {
  const actual = await repository.findById(id);
  if (!actual) {
    throw AppError.notFound(`No existe una solicitud con id ${id}`);
  }

  // Regla de negocio central de este bloque: ASIGNADA/EN_PROCESO exige
  // tecnico ya asignado. Es 409 (conflicto con el estado actual del recurso),
  // no 400: el body de la peticion es sintacticamente valido, lo invalido es
  // aplicarlo al estado actual de este recurso en particular.
  if (requiereTecnicoAsignado(estado) && !actual.tecnico) {
    throw AppError.conflict(
      `No se puede pasar a ${estado} sin un técnico asignado. Asigna un técnico primero (PUT) y luego cambia el estado.`,
    );
  }

  const actualizada = await repository.updateEstado(id, estado);
  if (!actualizada) {
    throw AppError.notFound(`No existe una solicitud con id ${id}`);
  }

  await repository.insertHistorial({
    solicitudId: id,
    estadoAnterior: actual.estado,
    estadoNuevo: estado,
    tecnicoIdAnterior: actual.tecnico?.id ?? null,
    tecnicoIdNuevo: actual.tecnico?.id ?? null,
    comentario: comentario ?? null,
  });

  return actualizada;
}

export async function eliminarSolicitud(id: number): Promise<void> {
  const eliminada = await repository.remove(id);
  if (!eliminada) {
    throw AppError.notFound(`No existe una solicitud con id ${id}`);
  }
}
