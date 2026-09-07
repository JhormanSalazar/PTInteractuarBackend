import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../../src/app.js';
import { resetDatabase, type SeedIds } from '../helpers/db.js';

let seed: SeedIds;

beforeEach(async () => {
  seed = await resetDatabase();
});

describe('GET /api/v1/tecnicos', () => {
  it('lista los técnicos', async () => {
    const res = await request(app).get('/api/v1/tecnicos');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  it('responde 404 para un id que no existe', async () => {
    const res = await request(app).get('/api/v1/tecnicos/999999');
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/v1/tecnicos/:id', () => {
  it('responde 409 si el técnico tiene solicitudes asociadas', async () => {
    await request(app).post('/api/v1/solicitudes').send({
      titulo: 'Solicitud asociada al técnico',
      solicitanteNombre: 'Cliente de prueba',
      tipoServicioId: seed.tipoServicioId,
      tecnicoId: seed.tecnicoId,
    });

    const res = await request(app).delete(`/api/v1/tecnicos/${seed.tecnicoId}`);

    expect(res.status).toBe(409);
    expect(res.body.type).toBe('https://api.local/errors/conflict');
  });

  it('elimina un técnico sin solicitudes asociadas', async () => {
    const res = await request(app).delete(`/api/v1/tecnicos/${seed.tecnicoInactivoId}`);
    expect(res.status).toBe(204);
  });

  it('responde 404 si el técnico no existe', async () => {
    const res = await request(app).delete('/api/v1/tecnicos/999999');
    expect(res.status).toBe(404);
  });
});
