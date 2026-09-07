import { pool } from '../../config/db.js';
import { SORT_SQL, type Estado, type Prioridad, type SORT_VALUES } from './solicitudes.schemas.js';

export interface SolicitudResponse {
  id: number;
  codigo: string;
  titulo: string;
  descripcion: string | null;
  solicitanteNombre: string;
  estado: Estado;
  prioridad: Prioridad;
  tecnico: { id: number; nombreCompleto: string } | null;
  tipoServicio: { id: number; nombre: string };
  fechaCreacion: string;
  fechaActualizacion: string;
  fechaLimite: string | null;
  notasCierre: string | null;
}

interface SolicitudRow {
  id: number;
  codigo: string;
  titulo: string;
  descripcion: string | null;
  solicitante_nombre: string;
  estado: Estado;
  prioridad: Prioridad;
  fecha_creacion: Date;
  fecha_actualizacion: Date;
  fecha_limite: Date | null;
  notas_cierre: string | null;
  tecnico_id: number | null;
  tecnico_nombre: string | null;
  tecnico_apellido: string | null;
  tipo_servicio_id: number;
  tipo_servicio_nombre: string;
}

const SELECT_COLUMNS = `
  s.id, s.codigo, s.titulo, s.descripcion, s.solicitante_nombre,
  s.estado, s.prioridad, s.fecha_creacion, s.fecha_actualizacion,
  s.fecha_limite, s.notas_cierre,
  t.id AS tecnico_id, t.nombre AS tecnico_nombre, t.apellido AS tecnico_apellido,
  ts.id AS tipo_servicio_id, ts.nombre AS tipo_servicio_nombre
`;

const FROM_JOIN = `
  FROM solicitud s
  LEFT JOIN tecnico t ON t.id = s.tecnico_id
  JOIN tipo_servicio ts ON ts.id = s.tipo_servicio_id
`;

function mapRow(row: SolicitudRow): SolicitudResponse {
  return {
    id: row.id,
    codigo: row.codigo,
    titulo: row.titulo,
    descripcion: row.descripcion,
    solicitanteNombre: row.solicitante_nombre,
    estado: row.estado,
    prioridad: row.prioridad,
    tecnico:
      row.tecnico_id != null
        ? { id: row.tecnico_id, nombreCompleto: `${row.tecnico_nombre} ${row.tecnico_apellido}` }
        : null,
    tipoServicio: { id: row.tipo_servicio_id, nombre: row.tipo_servicio_nombre },
    fechaCreacion: row.fecha_creacion.toISOString(),
    fechaActualizacion: row.fecha_actualizacion.toISOString(),
    fechaLimite: row.fecha_limite ? row.fecha_limite.toISOString() : null,
    notasCierre: row.notas_cierre,
  };
}

export interface SolicitudFilters {
  q?: string;
  estado?: Estado;
  prioridad?: Prioridad;
  tecnicoId?: number;
  tipoServicioId?: number;
}

/**
 * Arma el WHERE dinamico del listado. Cada condicion agrega su valor a
 * `params` y su placeholder ($N) se calcula con params.length DESPUES de
 * insertarlo, para que el indice siempre corresponda a la posicion real del
 * valor en el array que recibe `pg`. Ningun valor de usuario se concatena
 * jamas dentro del texto SQL: solo aparecen como $1, $2... nunca interpolados.
 */
function buildWhereClause(filters: SolicitudFilters): { where: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.q) {
    params.push(`%${filters.q}%`);
    conditions.push(`(s.titulo ILIKE $${params.length} OR s.solicitante_nombre ILIKE $${params.length})`);
  }
  if (filters.estado) {
    params.push(filters.estado);
    conditions.push(`s.estado = $${params.length}`);
  }
  if (filters.prioridad) {
    params.push(filters.prioridad);
    conditions.push(`s.prioridad = $${params.length}`);
  }
  if (filters.tecnicoId !== undefined) {
    params.push(filters.tecnicoId);
    conditions.push(`s.tecnico_id = $${params.length}`);
  }
  if (filters.tipoServicioId !== undefined) {
    params.push(filters.tipoServicioId);
    conditions.push(`s.tipo_servicio_id = $${params.length}`);
  }

  return { where: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

export async function findMany(
  filters: SolicitudFilters,
  page: number,
  pageSize: number,
  sort: (typeof SORT_VALUES)[number],
): Promise<{ rows: SolicitudResponse[]; total: number }> {
  const { where, params } = buildWhereClause(filters);
  const orderBy = SORT_SQL[sort];

  const dataParams = [...params, pageSize, (page - 1) * pageSize];
  const dataSql = `
    SELECT ${SELECT_COLUMNS}
    ${FROM_JOIN}
    ${where}
    ORDER BY ${orderBy}
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;
  const countSql = `SELECT count(*)::int AS total FROM solicitud s ${where}`;

  const [dataResult, countResult] = await Promise.all([
    pool.query<SolicitudRow>(dataSql, dataParams),
    pool.query<{ total: number }>(countSql, params),
  ]);

  return { rows: dataResult.rows.map(mapRow), total: countResult.rows[0]?.total ?? 0 };
}

export async function findById(id: number): Promise<SolicitudResponse | undefined> {
  const result = await pool.query<SolicitudRow>(
    `SELECT ${SELECT_COLUMNS} ${FROM_JOIN} WHERE s.id = $1`,
    [id],
  );
  return result.rows[0] ? mapRow(result.rows[0]) : undefined;
}

export interface CreateSolicitudRow {
  titulo: string;
  descripcion: string | null;
  solicitanteNombre: string;
  tecnicoId: number | null;
  tipoServicioId: number;
  prioridad: Prioridad;
  fechaLimite: string | null;
}

export async function create(data: CreateSolicitudRow): Promise<SolicitudResponse> {
  const result = await pool.query<{ id: number }>(
    `INSERT INTO solicitud
       (titulo, descripcion, solicitante_nombre, tecnico_id, tipo_servicio_id, prioridad, fecha_limite, estado)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDIENTE')
     RETURNING id`,
    [
      data.titulo,
      data.descripcion,
      data.solicitanteNombre,
      data.tecnicoId,
      data.tipoServicioId,
      data.prioridad,
      data.fechaLimite,
    ],
  );
  const created = await findById(result.rows[0]!.id);
  if (!created) throw new Error('No se pudo leer la solicitud recien creada');
  return created;
}

export interface UpdateSolicitudRow {
  titulo: string;
  descripcion: string | null;
  solicitanteNombre: string;
  tecnicoId: number | null;
  tipoServicioId: number;
  prioridad: Prioridad;
  fechaLimite: string | null;
}

export async function update(id: number, data: UpdateSolicitudRow): Promise<SolicitudResponse | undefined> {
  const result = await pool.query(
    `UPDATE solicitud
        SET titulo = $1, descripcion = $2, solicitante_nombre = $3, tecnico_id = $4,
            tipo_servicio_id = $5, prioridad = $6, fecha_limite = $7
      WHERE id = $8
      RETURNING id`,
    [
      data.titulo,
      data.descripcion,
      data.solicitanteNombre,
      data.tecnicoId,
      data.tipoServicioId,
      data.prioridad,
      data.fechaLimite,
      id,
    ],
  );
  if (result.rowCount === 0) return undefined;
  return findById(id);
}

export async function updateEstado(id: number, estado: Estado): Promise<SolicitudResponse | undefined> {
  const result = await pool.query('UPDATE solicitud SET estado = $1 WHERE id = $2 RETURNING id', [
    estado,
    id,
  ]);
  if (result.rowCount === 0) return undefined;
  return findById(id);
}

export async function remove(id: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM solicitud WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function insertHistorial(entry: {
  solicitudId: number;
  estadoAnterior: Estado | null;
  estadoNuevo: Estado;
  tecnicoIdAnterior: number | null;
  tecnicoIdNuevo: number | null;
  comentario?: string | null;
}): Promise<void> {
  await pool.query(
    `INSERT INTO solicitud_historial
       (solicitud_id, estado_anterior, estado_nuevo, tecnico_id_anterior, tecnico_id_nuevo, comentario)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      entry.solicitudId,
      entry.estadoAnterior,
      entry.estadoNuevo,
      entry.tecnicoIdAnterior,
      entry.tecnicoIdNuevo,
      entry.comentario ?? null,
    ],
  );
}
