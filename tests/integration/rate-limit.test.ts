import type { Express } from 'express';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

// RATE_LIMIT_WRITE_MAX se fija en 3 ANTES de cargar nada que toque
// src/config/env.ts. Importante: ni siquiera '../helpers/db.js' puede
// importarse de forma estatica arriba del archivo, porque los imports
// estaticos se elevan por encima de cualquier sentencia del modulo y ya
// cargarian env.ts (via db.ts) con el valor original antes de que esta linea
// corra. Por eso los dos imports van dinamicos dentro de beforeAll.
let app: Express;
let resetDatabase: () => Promise<unknown>;

beforeAll(async () => {
  process.env.RATE_LIMIT_WRITE_MAX = '3';
  const [appModule, dbHelper] = await Promise.all([
    import('../../src/app.js'),
    import('../helpers/db.js'),
  ]);
  app = appModule.default;
  resetDatabase = dbHelper.resetDatabase;
});

beforeEach(async () => {
  await resetDatabase();
});

describe('rate limit de escritura', () => {
  it('responde 429 al superar el límite configurado', async () => {
    const responses = [];
    for (let i = 0; i < 4; i += 1) {
      responses.push(await request(app).delete('/api/v1/tecnicos/999999'));
    }

    const statuses = responses.map((r) => r.status);
    expect(statuses.slice(0, 3)).toEqual([404, 404, 404]);
    expect(statuses[3]).toBe(429);
    expect(responses[3]!.body.type).toBe('https://api.local/errors/rate-limited');
  });
});
