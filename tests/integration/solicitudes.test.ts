import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../../src/app.js';
import { resetDatabase, type SeedIds } from '../helpers/db.js';

let seed: SeedIds;

beforeEach(async () => {
  seed = await resetDatabase();
});

function crearSolicitudBasica(overrides: Record<string, unknown> = {}) {
  return {
    titulo: 'Impresora no enciende en piso 2',
    solicitanteNombre: 'Juan Pérez',
    tipoServicioId: seed.tipoServicioId,
    ...overrides,
  };
}

describe('POST /api/v1/solicitudes', () => {
  it('crea una solicitud válida y responde 201 con Location', async () => {
    const res = await request(app).post('/api/v1/solicitudes').send(crearSolicitudBasica());

    expect(res.status).toBe(201);
    expect(res.headers.location).toBe(`/api/v1/solicitudes/${res.body.id}`);
    expect(res.body).toMatchObject({
      titulo: 'Impresora no enciende en piso 2',
      estado: 'PENDIENTE',
      prioridad: 'MEDIA',
      tecnico: null,
      tipoServicio: { id: seed.tipoServicioId },
    });
  });

  it('responde 400 con detalle por campo cuando faltan datos obligatorios', async () => {
    const res = await request(app)
      .post('/api/v1/solicitudes')
      .send({ titulo: 'abc' });

    expect(res.status).toBe(400);
    expect(res.body.type).toBe('https://api.local/errors/validation-error');
    const fields = res.body.errors.map((e: { field: string }) => e.field);
    expect(fields).toContain('titulo');
    expect(fields).toContain('solicitanteNombre');
    expect(fields).toContain('tipoServicioId');
  });

  it('responde 400 si el body trae un campo no reconocido (strict)', async () => {
    const res = await request(app)
      .post('/api/v1/solicitudes')
      .send(crearSolicitudBasica({ estado: 'RESUELTA' }));

    expect(res.status).toBe(400);
  });

  it('responde 422 si tipoServicioId no existe', async () => {
    const res = await request(app)
      .post('/api/v1/solicitudes')
      .send(crearSolicitudBasica({ tipoServicioId: 999999 }));

    expect(res.status).toBe(422);
    expect(res.body.errors[0].field).toBe('tipoServicioId');
  });

  it('responde 422 si tecnicoId no existe', async () => {
    const res = await request(app)
      .post('/api/v1/solicitudes')
      .send(crearSolicitudBasica({ tecnicoId: 999999 }));

    expect(res.status).toBe(422);
    expect(res.body.errors[0].field).toBe('tecnicoId');
  });
});

describe('GET /api/v1/solicitudes', () => {
  beforeEach(async () => {
    await request(app)
      .post('/api/v1/solicitudes')
      .send(crearSolicitudBasica({ titulo: 'Instalar antivirus en portátil', prioridad: 'BAJA' }));
    await request(app)
      .post('/api/v1/solicitudes')
      .send(
        crearSolicitudBasica({
          titulo: 'Impresora atascada en recepción',
          prioridad: 'ALTA',
          tecnicoId: seed.tecnicoId,
        }),
      );
  });

  it('pagina el listado y trae el total correcto', async () => {
    const res = await request(app).get('/api/v1/solicitudes').query({ pageSize: 1, page: 1 });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta).toMatchObject({ page: 1, pageSize: 1, total: 2, totalPages: 2 });
  });

  it('filtra por prioridad', async () => {
    const res = await request(app).get('/api/v1/solicitudes').query({ prioridad: 'ALTA' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].titulo).toBe('Impresora atascada en recepción');
  });

  it('filtra por tecnicoId', async () => {
    const res = await request(app).get('/api/v1/solicitudes').query({ tecnicoId: seed.tecnicoId });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].tecnico.id).toBe(seed.tecnicoId);
  });

  it('busca por texto en título', async () => {
    const res = await request(app).get('/api/v1/solicitudes').query({ q: 'impresora' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].titulo).toBe('Impresora atascada en recepción');
  });

  it('ordena por título ascendente', async () => {
    const res = await request(app)
      .get('/api/v1/solicitudes')
      .query({ sort: 'titulo:asc' });

    expect(res.status).toBe(200);
    expect(res.body.data[0].titulo).toBe('Impresora atascada en recepción');
    expect(res.body.data[1].titulo).toBe('Instalar antivirus en portátil');
  });

  it('responde 400 con page inválida', async () => {
    const res = await request(app).get('/api/v1/solicitudes').query({ page: 0 });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/v1/solicitudes/:id', () => {
  it('responde 404 si no existe', async () => {
    const res = await request(app).get('/api/v1/solicitudes/999999');
    expect(res.status).toBe(404);
    expect(res.body.type).toBe('https://api.local/errors/not-found');
  });

  it('responde 400 si el id no es numérico', async () => {
    const res = await request(app).get('/api/v1/solicitudes/abc');
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/v1/solicitudes/:id', () => {
  it('actualiza una solicitud existente', async () => {
    const creada = await request(app).post('/api/v1/solicitudes').send(crearSolicitudBasica());

    const res = await request(app)
      .put(`/api/v1/solicitudes/${creada.body.id}`)
      .send({
        titulo: 'Impresora reparada, requiere seguimiento',
        descripcion: null,
        solicitanteNombre: 'Juan Pérez',
        tecnicoId: seed.tecnicoId,
        tipoServicioId: seed.tipoServicioId,
        prioridad: 'ALTA',
        fechaLimite: null,
      });

    expect(res.status).toBe(200);
    expect(res.body.titulo).toBe('Impresora reparada, requiere seguimiento');
    expect(res.body.tecnico.id).toBe(seed.tecnicoId);
  });

  it('responde 404 si la solicitud no existe', async () => {
    const res = await request(app)
      .put('/api/v1/solicitudes/999999')
      .send({
        titulo: 'No existe',
        descripcion: null,
        solicitanteNombre: 'Nadie',
        tecnicoId: null,
        tipoServicioId: seed.tipoServicioId,
        prioridad: 'BAJA',
        fechaLimite: null,
      });

    expect(res.status).toBe(404);
  });

  it('responde 409 si intenta quitar el técnico de una solicitud ASIGNADA/EN_PROCESO', async () => {
    const creada = await request(app)
      .post('/api/v1/solicitudes')
      .send(crearSolicitudBasica({ tecnicoId: seed.tecnicoId }));
    await request(app)
      .patch(`/api/v1/solicitudes/${creada.body.id}/estado`)
      .send({ estado: 'ASIGNADA' });

    const res = await request(app)
      .put(`/api/v1/solicitudes/${creada.body.id}`)
      .send({
        titulo: creada.body.titulo,
        descripcion: null,
        solicitanteNombre: creada.body.solicitanteNombre,
        tecnicoId: null,
        tipoServicioId: seed.tipoServicioId,
        prioridad: 'MEDIA',
        fechaLimite: null,
      });

    expect(res.status).toBe(409);
  });
});

describe('PATCH /api/v1/solicitudes/:id/estado', () => {
  it('responde 409 al pasar a EN_PROCESO sin técnico asignado', async () => {
    const creada = await request(app).post('/api/v1/solicitudes').send(crearSolicitudBasica());

    const res = await request(app)
      .patch(`/api/v1/solicitudes/${creada.body.id}/estado`)
      .send({ estado: 'EN_PROCESO' });

    expect(res.status).toBe(409);
    expect(res.body.type).toBe('https://api.local/errors/conflict');
  });

  it('permite pasar a ASIGNADA cuando ya tiene técnico', async () => {
    const creada = await request(app)
      .post('/api/v1/solicitudes')
      .send(crearSolicitudBasica({ tecnicoId: seed.tecnicoId }));

    const res = await request(app)
      .patch(`/api/v1/solicitudes/${creada.body.id}/estado`)
      .send({ estado: 'ASIGNADA', comentario: 'Se asigna al técnico disponible' });

    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('ASIGNADA');
  });

  it('responde 404 si la solicitud no existe', async () => {
    const res = await request(app)
      .patch('/api/v1/solicitudes/999999/estado')
      .send({ estado: 'CANCELADA' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/v1/solicitudes/:id', () => {
  it('elimina una solicitud existente y responde 204 sin cuerpo', async () => {
    const creada = await request(app).post('/api/v1/solicitudes').send(crearSolicitudBasica());

    const res = await request(app).delete(`/api/v1/solicitudes/${creada.body.id}`);

    expect(res.status).toBe(204);
    expect(res.text).toBe('');

    const getRes = await request(app).get(`/api/v1/solicitudes/${creada.body.id}`);
    expect(getRes.status).toBe(404);
  });

  it('responde 404 si no existe', async () => {
    const res = await request(app).delete('/api/v1/solicitudes/999999');
    expect(res.status).toBe(404);
  });
});
