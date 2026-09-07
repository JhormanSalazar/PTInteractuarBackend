import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Los tests de integracion comparten una Postgres real y cada uno trunca
    // las tablas de dominio en beforeEach; correr archivos en paralelo haria
    // que un test le borre los datos a otro que corre al mismo tiempo.
    fileParallelism: false,
  },
});
