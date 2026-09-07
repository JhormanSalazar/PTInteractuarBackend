import { describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';

// Requiere la base de datos de tests levantada (docker compose up -d) y
// DATABASE_URL apuntando a pt_interactuar_test. Ver README > "Cómo correr los tests".
describe('GET /api/v1/health', () => {
  it('responde 200 con la base de datos disponible', async () => {
    const response = await request(app).get('/api/v1/health');

    const body = response.body as { status: string; database: string; timestamp: string };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ status: 'ok', database: 'ok' });
    expect(typeof body.timestamp).toBe('string');
  });
});
