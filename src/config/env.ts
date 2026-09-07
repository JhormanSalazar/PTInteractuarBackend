import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL es obligatoria')
    .regex(/^postgres(ql)?:\/\/.+/, 'DATABASE_URL debe ser una cadena de conexion postgres:// valida'),
  CORS_ORIGIN: z
    .string()
    .min(1, 'CORS_ORIGIN no puede estar vacio')
    .transform((value) => value.split(',').map((origin) => origin.trim())),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'silent']).default('info'),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  DEMO_MODE: z
    .string()
    .default('false')
    .transform((value) => value === 'true'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Valida las variables de entorno al arrancar el proceso. Si falta o es invalida
 * alguna, el arranque falla de inmediato con un mensaje claro en vez de romperse
 * a mitad de una peticion.
 */
function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Configuracion de entorno invalida. Revisa tu archivo .env:\n');
    for (const issue of result.error.issues) {
      console.error(`  - ${issue.path.join('.') || '(raiz)'}: ${issue.message}`);
    }
    process.exit(1);
  }

  return result.data;
}

export const env = loadEnv();
