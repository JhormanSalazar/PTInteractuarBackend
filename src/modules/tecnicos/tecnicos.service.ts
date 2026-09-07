import { AppError } from '../../shared/AppError.js';
import * as repository from './tecnicos.repository.js';

export async function eliminarTecnico(id: number): Promise<void> {
  const tecnico = await repository.findById(id);
  if (!tecnico) {
    throw AppError.notFound(`No existe un técnico con id ${id}`);
  }

  const solicitudesAsignadas = await repository.countSolicitudesAsignadas(id);
  if (solicitudesAsignadas > 0) {
    throw AppError.conflict(
      `No se puede eliminar el técnico ${id}: tiene ${solicitudesAsignadas} solicitud(es) asociada(s).`,
    );
  }

  await repository.remove(id);
}
