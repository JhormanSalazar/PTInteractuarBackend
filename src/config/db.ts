import { Pool } from 'pg';
import { env } from './env.js';

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
