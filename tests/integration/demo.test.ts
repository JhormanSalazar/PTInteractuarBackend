import type { Express } from 'express';
import type { Pool } from 'pg';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DEMO_COUNTS } from '../../src/modules/demo/demo.data.js';

// Mismo patron que rate-limit.test.ts: DEMO_MODE debe estar puesto ANTES de
// que se cargue src/config/env.ts, y los imports estaticos se elevan por
// encima de cualquier sentencia del modulo. De ahi los imports dinamicos.
// El limite del reset se sube porque su default (3 por 15 minutos) esta
// pensado para la demo publica, no para una bateria de tests.
let app: Express;
let resetDatabase: () => Promise<unknown>;
let pool: Pool;

beforeAll(async () => {
  process.env.DEMO_MODE = 'true';
  process.env.RATE_LIMIT_DEMO_MAX = '50';
  const [appModule, dbHelper, dbModule] = await Promise.all([
    import('../../src/app.js'),
    import('../helpers/db.js'),
    import('../../src/config/db.js'),
  ]);
  app = appModule.default;
  resetDatabase = dbHelper.resetDatabase;
  pool = dbModule.pool;
});

beforeEach(async () => {
  await resetDatabase();
});

describe('POST /api/v1/demo/reset con DEMO_MODE=true', () => {
  it('repuebla la base con el dataset de demostración', async () => {
    const response = await request(app).post('/api/v1/demo/reset');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      tecnicos: DEMO_COUNTS.tecnicos,
      tiposServicio: DEMO_COUNTS.tiposServicio,
      solicitudes: DEMO_COUNTS.solicitudes,
    });
    expect(response.body.mensaje).toBeTypeOf('string');
  });

  it('deja el listado con datos después de haberlo vaciado', async () => {
    await pool.query('DELETE FROM solicitud');
    const vacio = await request(app).get('/api/v1/solicitudes');
    expect(vacio.body.data).toHaveLength(0);

    await request(app).post('/api/v1/demo/reset');

    const lleno = await request(app).get('/api/v1/solicitudes');
    expect(lleno.body.meta.total).toBe(DEMO_COUNTS.solicitudes);
  });

  it('es idempotente: dos resets seguidos dejan los mismos conteos', async () => {
    const primero = await request(app).post('/api/v1/demo/reset');
    const segundo = await request(app).post('/api/v1/demo/reset');

    expect(segundo.status).toBe(200);
    expect(segundo.body).toEqual(primero.body);
  });

  it('reinicia la secuencia de códigos, que no depende de RESTART IDENTITY', async () => {
    await request(app).post('/api/v1/demo/reset');
    const primera = await pool.query<{ codigo: string }>(
      'SELECT codigo FROM solicitud ORDER BY id ASC LIMIT 1',
    );

    await request(app).post('/api/v1/demo/reset');
    const despues = await pool.query<{ codigo: string }>(
      'SELECT codigo FROM solicitud ORDER BY id ASC LIMIT 1',
    );

    expect(despues.rows[0]!.codigo).toBe(primera.rows[0]!.codigo);
    expect(despues.rows[0]!.codigo).toMatch(/^SOL-\d{4}-0001$/);
  });
});
