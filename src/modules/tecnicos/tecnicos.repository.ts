import { pool } from '../../config/db.js';

export interface Tecnico {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  activo: boolean;
}

interface TecnicoRow {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  activo: boolean;
}

function mapRow(row: TecnicoRow): Tecnico {
  return {
    id: row.id,
    nombre: row.nombre,
    apellido: row.apellido,
    email: row.email,
    telefono: row.telefono,
    activo: row.activo,
  };
}

const COLUMNS = 'id, nombre, apellido, email, telefono, activo';

export async function findAll(): Promise<Tecnico[]> {
  const result = await pool.query<TecnicoRow>(
    `SELECT ${COLUMNS} FROM tecnico ORDER BY nombre, apellido`,
  );
  return result.rows.map(mapRow);
}

export async function findById(id: number): Promise<Tecnico | undefined> {
  const result = await pool.query<TecnicoRow>(`SELECT ${COLUMNS} FROM tecnico WHERE id = $1`, [id]);
  return result.rows[0] ? mapRow(result.rows[0]) : undefined;
}

export async function countSolicitudesAsignadas(tecnicoId: number): Promise<number> {
  const result = await pool.query<{ total: number }>(
    'SELECT count(*)::int AS total FROM solicitud WHERE tecnico_id = $1',
    [tecnicoId],
  );
  return result.rows[0]?.total ?? 0;
}

export async function remove(id: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM tecnico WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}
