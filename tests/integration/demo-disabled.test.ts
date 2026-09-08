import type { Express } from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';

// Archivo aparte del de demo.test.ts a proposito: DEMO_MODE se lee una sola vez
// al cargar el modulo de configuracion, y app.ts decide en ese momento si monta
// el router. Comprobar los dos valores en el mismo archivo obligaria a resetear
// el registro de modulos y a dejar un segundo pool de Postgres abierto.
// vitest.config.ts corre con fileParallelism:false, asi que cada archivo tiene
// su propio registro y no se pisan.
let app: Express;

beforeAll(async () => {
  process.env.DEMO_MODE = 'false';
  app = (await import('../../src/app.js')).default;
});

describe('POST /api/v1/demo/reset con DEMO_MODE=false', () => {
  it('responde 404, igual que cualquier ruta inexistente', async () => {
    const response = await request(app).post('/api/v1/demo/reset');

    expect(response.status).toBe(404);
    expect(response.body.type).toBe('https://api.local/errors/not-found');
  });
});
