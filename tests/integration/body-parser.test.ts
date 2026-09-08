import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../../src/app.js';

describe('errores de parseo del cuerpo de la petición', () => {
  it('responde 400 con Problem Details ante un JSON malformado, no 500', async () => {
    const response = await request(app)
      .post('/api/v1/solicitudes')
      .set('Content-Type', 'application/json')
      .send('{"titulo": "falta una llave"');

    expect(response.status).toBe(400);
    expect(response.body.type).toBe('https://api.local/errors/invalid-body');
    expect(response.body.traceId).toBeTypeOf('string');
  });

  it('responde 413 cuando el cuerpo supera el límite de 100kb', async () => {
    const response = await request(app)
      .post('/api/v1/solicitudes')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ titulo: 'x'.repeat(200_000) }));

    expect(response.status).toBe(413);
    expect(response.body.type).toBe('https://api.local/errors/payload-too-large');
  });

  it('incluye traceId también en las respuestas de error tempranas', async () => {
    const response = await request(app)
      .post('/api/v1/solicitudes')
      .set('Content-Type', 'application/json')
      .send('no es json');

    expect(response.body.traceId).toBeTypeOf('string');
    expect(response.headers['x-trace-id']).toBeTypeOf('string');
  });
});
