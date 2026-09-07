import { pool } from '../../src/config/db.js';

export interface SeedIds {
  tecnicoId: number;
  tecnicoInactivoId: number;
  tipoServicioId: number;
}

/**
 * Deja las tablas de dominio vacias y con un par de filas de catalogo fijas
 * para que los tests de solicitudes tengan FKs validas a mano. Se corre en
 * beforeEach; con vitest.config.ts en fileParallelism:false es seguro porque
 * nunca hay dos archivos de test tocando la base al mismo tiempo.
 */
export async function resetDatabase(): Promise<SeedIds> {
  await pool.query(
    'TRUNCATE TABLE solicitud_historial, solicitud, tecnico, tipo_servicio RESTART IDENTITY CASCADE',
  );

  const tecnico = await pool.query<{ id: number }>(
    `INSERT INTO tecnico (nombre, apellido, email, activo) VALUES ('Ana', 'Ríos', 'ana.rios.test@example.com', true) RETURNING id`,
  );
  const tecnicoInactivo = await pool.query<{ id: number }>(
    `INSERT INTO tecnico (nombre, apellido, email, activo) VALUES ('Luis', 'Vega', 'luis.vega.test@example.com', false) RETURNING id`,
  );
  const tipoServicio = await pool.query<{ id: number }>(
    `INSERT INTO tipo_servicio (nombre, sla_horas) VALUES ('Soporte General', 8) RETURNING id`,
  );

  return {
    tecnicoId: tecnico.rows[0]!.id,
    tecnicoInactivoId: tecnicoInactivo.rows[0]!.id,
    tipoServicioId: tipoServicio.rows[0]!.id,
  };
}
