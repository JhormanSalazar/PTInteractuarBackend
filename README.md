# PT Interactuar — Backend

API REST en Express que expone la información de asignación de tareas a técnicos TI. Este
documento cubre el arranque en desarrollo local; las decisiones de arquitectura y el modelo de
datos completo se documentan en el entregable (Word) del proyecto.

## Requisitos (versiones verificadas en esta máquina)

| Herramienta | Versión verificada | Cómo se comprobó |
|---|---|---|
| Node.js | **24.20.0** | `node -v` |
| npm | **11.19.0** | `npm -v` |
| Docker Desktop | — | **No instalado en esta máquina al momento de escribir este README.** Instálalo desde https://www.docker.com/products/docker-desktop/ antes de seguir los pasos de abajo. |
| Docker Compose | v2 (integrado en Docker Desktop) | `docker compose version` |

> El proyecto fija `"engines": { "node": "24.x" }` en `package.json`. Vercel usa Node 24.x por
> defecto para nuevos proyectos (verificado en la documentación oficial el 2026-09-07); si tu
> proyecto de Vercel quedó en una versión distinta, ajusta el rango en `engines` o cambia la
> versión en **Project Settings → Build and Deployment → Node.js Version**.

## Arranque desde cero

Copiable en bloque, en orden:

```bash
docker compose up -d
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

Qué esperar de cada paso:

1. **`docker compose up -d`** — descarga (la primera vez) y levanta `postgres:17-alpine` con dos
   bases: `pt_interactuar_dev` y `pt_interactuar_test`. Confirmalo con
   `docker compose ps`: la columna `STATUS` debe decir `healthy` a los pocos segundos.
2. **`npm install`** — instala Express, `pg`, Zod, TypeScript, ESLint, Vitest, etc. Termina con
   `added N packages`.
3. **`cp .env.example .env`** — crea tu copia local de variables de entorno (no se versiona).
4. **`npm run db:migrate`** — crea la tabla de control `schema_migrations` y aplica los `.sql`
   pendientes de `db/migrations/`. En este punto del proyecto esa carpeta todavía no tiene
   migraciones de dominio (technicos/solicitudes se agregan en el siguiente bloque de trabajo),
   así que verás `[migrate] aplicada: ...` únicamente si hay archivos, o ningún mensaje si la
   carpeta está vacía — no es un error.
5. **`npm run db:seed`** — hoy imprime `[seed] sin datos de dominio que sembrar todavia`, porque
   aún no existen tablas de dominio que sembrar.
6. **`npm run dev`** — arranca con recarga en caliente. Debe imprimir:
   `[server] escuchando en http://localhost:3000 (development)`.

Verificación rápida:

```bash
curl http://localhost:3000/api/v1/health
# {"status":"ok","database":"ok","timestamp":"2026-09-07T22:00:00.000Z"}
```

## Variables de entorno

| Variable | Para qué sirve | Valor de ejemplo en local | Obligatoria |
|---|---|---|---|
| `NODE_ENV` | Selecciona comportamiento por entorno (SSL de la BD, mensajes de error) | `development` | Sí (tiene default `development`) |
| `PORT` | Puerto HTTP donde escucha el servidor. Vercel lo ignora y asigna el suyo. | `3000` | No (default `3000`) |
| `DATABASE_URL` | Cadena de conexión a PostgreSQL | `postgresql://pt_user:pt_password@localhost:5432/pt_interactuar_dev` | **Sí** |
| `CORS_ORIGIN` | Orígenes permitidos, separados por coma, sin espacios | `http://localhost:4200` | **Sí** |
| `LOG_LEVEL` | Nivel de log (`debug`\|`info`\|`warn`\|`error`\|`silent`) | `debug` | No (default `info`) |
| `RATE_LIMIT_MAX` | Peticiones máximas por IP cada 15 min antes de `429` | `1000` | No (default `100`) |
| `DEMO_MODE` | Habilita el endpoint de reseteo de demo (se agrega en un bloque posterior) | `false` | No (default `false`) |

Toda variable se valida con **Zod** al arrancar (`src/config/env.ts`): si falta una obligatoria o
tiene un formato inválido, el proceso termina con `process.exit(1)` y un mensaje señalando
exactamente qué variable falló, en vez de fallar más tarde a mitad de una petición.

## Scripts npm

| Script | Qué hace |
|---|---|
| `npm run dev` | Arranca el servidor con recarga en caliente (`tsx watch src/server.ts`) |
| `npm run build` | Compila TypeScript a `dist/` (`tsconfig.build.json`, solo `src/`) |
| `npm start` | Arranca el servidor ya compilado (`node dist/server.js`) — lo usa Vercel/producción |
| `npm run db:migrate` | Aplica las migraciones `.sql` pendientes de `db/migrations/` |
| `npm run db:seed` | Inserta datos de demostración |
| `npm test` | Corre los tests (Vitest + Supertest) |
| `npm run lint` | ESLint (flat config, reglas type-aware de `typescript-eslint`) |
| `npm run typecheck` | `tsc --noEmit` sobre todo el proyecto (`src/`, `db/`, `tests/`) |

## Tests

Los tests de integración levantan la app con Supertest **sin abrir un puerto** (importan
`src/app.ts`, no `src/server.ts`) pero sí necesitan una base de datos real accesible por
`DATABASE_URL`. Con Docker ya corriendo:

```bash
docker compose up -d
npm run db:migrate
DATABASE_URL=postgresql://pt_user:pt_password@localhost:5432/pt_interactuar_test npm test
```

> Por qué una base separada para test: así los datos de desarrollo nunca se pisan ni se vacían al
> correr la suite, y el pipeline de tests puede truncar/recrear tablas sin arriesgar el seed de
> desarrollo.

## Apuntar el backend local contra Neon (en vez de Docker)

Útil para reproducir un problema que solo aparece en producción:

```bash
# En .env, reemplaza DATABASE_URL por la cadena de Neon.
# Usa la cadena CON pooler para replicar el comportamiento real de producción,
# o la DIRECTA si necesitas ejecutar DDL/migraciones (algunas operaciones administrativas
# se comportan distinto a través de PgBouncer en modo transacción).
DATABASE_URL="postgresql://usuario:password@ep-xxxx-pooler.region.aws.neon.tech/neondb?sslmode=require" npm run dev
```

No hace falta cambiar código: `NODE_ENV=production` activa `ssl: { rejectUnauthorized: true }` en
el pool (`src/config/db.ts`); en `development`/`test` el pool no fuerza SSL porque Docker local no
lo expone.

## Problemas frecuentes

- **Puerto 5432 ocupado** — otro Postgres local (u otro proyecto) ya lo usa. Cambia el mapeo de
  puertos en `docker-compose.yml` (por ejemplo `"5433:5432"`) y actualiza `DATABASE_URL`.
- **El contenedor no levanta / `docker compose ps` no marca `healthy`** — revisa
  `docker compose logs postgres`. Lo más común es un volumen corrupto de un intento anterior:
  `docker compose down -v` y vuelve a `docker compose up -d` (esto borra los datos locales).
- **"ya aplicada, se omite" en una migración que creías nueva** — el runner ya la registró en
  `schema_migrations`. Si de verdad necesitas reaplicarla, bórrala de esa tabla manualmente o
  reinicia el volumen con `docker compose down -v`.
- **Error de CORS en el navegador** — `CORS_ORIGIN` en `.env` debe incluir, exactamente (protocolo
  + host + puerto), el origen desde el que sirves el frontend. `http://localhost:4200` y
  `http://127.0.0.1:4200` **no** son el mismo origen para CORS.
- **`Cannot find module 'dist/server.js'`** — falta compilar. Corre `npm run build` antes de
  `npm start`.

## URLs de producción

- Backend: _pendiente de despliegue — se completa en el siguiente bloque de trabajo una vez
  creado el proyecto en Neon y vinculado el proyecto en Vercel (ver "Cosas por configurar a mano"
  en el reporte de este bloque)._

## Decisión fuera del plan original

El plan (`docs/PLAN-DESARROLLO.md`) ubicaba el `Pool` de `pg` en `db/pool.ts`. Se movió a
`src/config/db.ts` para que quede junto al resto de la configuración y para no dejar ninguna duda
sobre qué archivos entran al bundle que Vercel arma a partir de `src/app.ts`; `db/` queda
reservado para los `.sql` de migración y el runner (`db/migrate.ts`, `db/seed.ts`), que se
ejecutan como script independiente vía `tsx` y nunca forman parte de la función serverless.
