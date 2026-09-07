import { Pool, types } from 'pg';
import { env } from './env.js';

// `pg` devuelve BIGINT/BIGSERIAL (OID 20) como string por defecto, porque en
// general no caben en un number de JS sin perder precision. Los ids de este
// proyecto nunca se acercaran a ese limite, y devolver "5" en vez de 5 en el
// JSON de la API es mas sorpresa que seguridad, asi que se parsean como
// numero. Confirmado con una prueba manual: sin esto, GET /tecnicos
// devolvia {"id":"5", ...}.
types.setTypeParser(types.builtins.INT8, (value) => parseInt(value, 10));

/**
 * Pool declarado a nivel de modulo: se crea una sola vez por instancia del
 * proceso/funcion y se reutiliza entre peticiones. Crear el Pool dentro de un
 * handler agotaria las conexiones disponibles de Postgres en minutos bajo
 * ejecucion serverless, porque cada invocacion abriria las suyas propias.
 */
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : undefined,
  max: env.NODE_ENV === 'production' ? 5 : 10,
  // Neon (tier gratuito) suspende el computo tras inactividad; la primera
  // conexion tras ese "cold start" puede tardar cerca de un segundo. Un
  // timeout por defecto de ~0ms/poco tolerante haria fallar justo esa
  // primera peticion en vez de esperarla.
  connectionTimeoutMillis: 10_000,
});

pool.on('error', (err) => {
  // Conexiones ociosas que el servidor cierra por su cuenta no deben tumbar el proceso.
  console.error('Error inesperado en una conexion ociosa del pool de Postgres', err);
});

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Fallo el chequeo de conexion a la base de datos', error);
    return false;
  }
}
