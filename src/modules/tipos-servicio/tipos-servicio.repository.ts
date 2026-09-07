import { pool } from '../../config/db.js';

export interface TipoServicio {
  id: number;
  nombre: string;
  descripcion: string | null;
  slaHoras: number;
  activo: boolean;
}

interface TipoServicioRow {
  id: number;
  nombre: string;
  descripcion: string | null;
  sla_horas: number;
  activo: boolean;
}

function mapRow(row: TipoServicioRow): TipoServicio {
  return {
    id: row.id,
    nombre: row.nombre,
    descripcion: row.descripcion,
    slaHoras: row.sla_horas,
    activo: row.activo,
  };
}

export async function findAll(): Promise<TipoServicio[]> {
  const result = await pool.query<TipoServicioRow>(
    'SELECT id, nombre, descripcion, sla_horas, activo FROM tipo_servicio ORDER BY nombre',
  );
  return result.rows.map(mapRow);
}

export async function findById(id: number): Promise<TipoServicio | undefined> {
  const result = await pool.query<TipoServicioRow>(
    'SELECT id, nombre, descripcion, sla_horas, activo FROM tipo_servicio WHERE id = $1',
    [id],
  );
  return result.rows[0] ? mapRow(result.rows[0]) : undefined;
}
