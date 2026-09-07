import { describe, expect, it } from 'vitest';
import { requiereTecnicoAsignado } from '../../src/modules/solicitudes/solicitudes.service.js';

describe('requiereTecnicoAsignado', () => {
  it.each(['ASIGNADA', 'EN_PROCESO'] as const)('exige técnico para %s', (estado) => {
    expect(requiereTecnicoAsignado(estado)).toBe(true);
  });

  it.each(['PENDIENTE', 'RESUELTA', 'CANCELADA'] as const)('no exige técnico para %s', (estado) => {
    expect(requiereTecnicoAsignado(estado)).toBe(false);
  });
});
