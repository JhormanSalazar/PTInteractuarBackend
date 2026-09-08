import { pool } from '../src/config/db.js';
import { resetDemoData } from '../src/modules/demo/demo.service.js';

/**
 * Deja la base con los datos de demostracion.
 *
 * El camino normal es que ya los tenga: db/migrations/002_seed.sql los inserta
 * durante "npm run db:migrate", protegido por schema_migrations para que no se
 * dupliquen al correr dos veces.
 *
 * Pero hay un caso que antes dejaba a este script sin nada util que hacer: si
 * la base conserva el registro de migraciones y en cambio perdio las filas
 * (por ejemplo despues de correr la suite de tests contra ella, que trunca las
 * tablas), "db:migrate" salta el seed por considerarlo ya aplicado y la base
 * se queda vacia. Este script se limitaba a decir "corre db:migrate primero",
 * que no arreglaba nada. Ahora, si esta vacia, la siembra de verdad
 * reutilizando la misma operacion transaccional del endpoint de demo.
 */
async function seed(): Promise<void> {
  const result = await pool.query<{ total: number }>('SELECT count(*)::int AS total FROM solicitud');
  const total = result.rows[0]?.total ?? 0;

  if (total > 0) {
    console.log(`[seed] la base ya tiene ${total} solicitudes, no se toca nada.`);
    await pool.end();
    return;
  }

  console.log('[seed] la base esta vacia, sembrando los datos de demostracion...');
  const counts = await resetDemoData();
  console.log(
    `[seed] listo: ${counts.solicitudes} solicitudes, ${counts.tecnicos} tecnicos, ${counts.tiposServicio} tipos de servicio.`,
  );

  await pool.end();
}

await seed();
