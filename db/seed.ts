import { pool } from '../src/config/db.js';

/**
 * Placeholder deliberado: en este bloque no existen tablas de dominio
 * (tecnico, solicitud, tipo_servicio) todavia, asi que no hay nada que
 * sembrar. El script existe para que `npm run db:seed` funcione desde ya y
 * el bloque siguiente solo tenga que agregar los INSERT.
 */
async function seed(): Promise<void> {
  await pool.query('SELECT 1');
  console.log('[seed] sin datos de dominio que sembrar todavia (bootstrap del proyecto).');
  await pool.end();
}

await seed();
