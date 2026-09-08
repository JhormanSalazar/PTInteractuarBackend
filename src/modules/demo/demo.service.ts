import { pool } from '../../config/db.js';
import { DEMO_SEED_STATEMENTS } from './demo.data.js';

export interface DemoResetResult {
  tecnicos: number;
  tiposServicio: number;
  solicitudes: number;
}

/**
 * Vacia y vuelve a sembrar los datos de demostracion dentro de una unica
 * transaccion: o queda el dataset completo, o no cambia nada. Un evaluador que
 * borre solicitudes probando el CRUD nunca deja la tabla vacia para el
 * siguiente que abra el enlace.
 *
 * Usa un cliente dedicado del pool (pool.connect) y no pool.query: cada
 * pool.query puede tomar una conexion distinta, asi que BEGIN y COMMIT
 * acabarian en sesiones diferentes y la transaccion no existiria.
 */
export async function resetDemoData(): Promise<DemoResetResult> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // RESTART IDENTITY reinicia las secuencias BIGSERIAL de las tablas
    // truncadas, y CASCADE cubre las FK entre ellas.
    await client.query(
      'TRUNCATE TABLE solicitud_historial, solicitud, tecnico, tipo_servicio RESTART IDENTITY CASCADE',
    );

    // solicitud_codigo_seq se creo con CREATE SEQUENCE suelto (001_schema.sql),
    // no como secuencia propiedad de una columna, asi que TRUNCATE ... RESTART
    // IDENTITY no la toca. Sin esto los codigos seguirian en SOL-2026-0018,
    // 0035, 0052... despues de cada reset.
    await client.query('ALTER SEQUENCE solicitud_codigo_seq RESTART');

    for (const statement of DEMO_SEED_STATEMENTS) {
      await client.query(statement);
    }

    const counts = await client.query<{
      tecnicos: string;
      tipos_servicio: string;
      solicitudes: string;
    }>(
      `SELECT
         (SELECT count(*) FROM tecnico) AS tecnicos,
         (SELECT count(*) FROM tipo_servicio) AS tipos_servicio,
         (SELECT count(*) FROM solicitud) AS solicitudes`,
    );

    await client.query('COMMIT');

    const row = counts.rows[0]!;
    return {
      tecnicos: Number(row.tecnicos),
      tiposServicio: Number(row.tipos_servicio),
      solicitudes: Number(row.solicitudes),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
