import { pool } from '../src/config/db.js';

/**
 * Los datos de demostracion viven como migracion versionada
 * (db/migrations/002_seed.sql), no aqui: asi "npm run db:migrate" deja la
 * base lista de un solo paso y el seed queda protegido por la misma tabla
 * schema_migrations (no se duplica si se corre dos veces). Este script solo
 * confirma que la base tiene datos y avisa si no los tiene, en vez de volver
 * a insertarlos.
 */
async function seed(): Promise<void> {
  const result = await pool.query<{ total: number }>('SELECT count(*)::int AS total FROM solicitud');
  const total = result.rows[0]?.total ?? 0;

  if (total > 0) {
    console.log(`[seed] la base ya tiene ${total} solicitudes (sembradas por 002_seed.sql).`);
  } else {
    console.log('[seed] no hay solicitudes. Corre "npm run db:migrate" primero: el seed va ahi.');
  }

  await pool.end();
}

await seed();
