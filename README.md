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
4. **`npm run db:migrate`** — crea la tabla de control `schema_migrations` y aplica en orden
   `db/migrations/001_schema.sql` (DDL: `tecnico`, `tipo_servicio`, `solicitud`,
   `solicitud_historial`) y `002_seed.sql`. Verás `[migrate] aplicada: 001_schema.sql` y
   `[migrate] aplicada: 002_seed.sql`; si vuelves a correrlo, `[migrate] ya aplicada, se omite`
   para ambos (es idempotente).
5. **`npm run db:seed`** — los datos ya quedaron insertados por `002_seed.sql` en el paso
   anterior (el seed vive como migración para que quede versionado y protegido por
   `schema_migrations`, en vez de insertarse dos veces). Este comando solo confirma cuántas
   solicitudes hay: `[seed] la base ya tiene 17 solicitudes (sembradas por 002_seed.sql).`
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
| `RATE_LIMIT_MAX` | Peticiones máximas por IP cada 15 min antes de `429` (todas las rutas) | `1000` | No (default `100`) |
| `RATE_LIMIT_WRITE_MAX` | Igual, pero solo para `POST`/`PUT`/`PATCH`/`DELETE` (límite más estricto) | `200` | No (default `30`) |
| `DEMO_MODE` | Habilita el endpoint de reseteo de demo (se agrega en un bloque posterior) | `false` | No (default `false`) |

> Si vas a correr la suite de tests completa contra tu `.env`, sube `RATE_LIMIT_WRITE_MAX` a un
> número alto (100000, por ejemplo): son ~35 tests y varios hacen POST/PUT/PATCH/DELETE, así que
> con el default de 30 la suite se dispara su propio 429 antes de terminar. El test dedicado al
> 429 (`tests/integration/rate-limit.test.ts`) no depende de esta variable: se fija su propio
> límite bajo internamente para el archivo, sin afectar al resto de la suite.

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

## Endpoints

Base: `/api/v1`. Documentación interactiva (Swagger UI) en `GET /api/docs` una vez el servidor
está corriendo; el spec fuente es `src/docs/openapi.yaml`.

| Método | Ruta | Éxito | Errores |
|---|---|---|---|
| `GET` | `/health` | `200` (o `503` si la BD no responde) | — |
| `GET` | `/solicitudes?page&pageSize&q&estado&prioridad&tecnicoId&tipoServicioId&sort` | `200` | `400` |
| `GET` | `/solicitudes/:id` | `200` | `400`, `404` |
| `POST` | `/solicitudes` | `201` + header `Location` | `400`, `422`, `429` |
| `PUT` | `/solicitudes/:id` | `200` | `400`, `404`, `409`, `422`, `429` |
| `PATCH` | `/solicitudes/:id/estado` | `200` | `400`, `404`, `409`, `429` |
| `DELETE` | `/solicitudes/:id` | `204` | `404`, `429` |
| `GET` | `/tecnicos` · `/tecnicos/:id` | `200` | `404` |
| `DELETE` | `/tecnicos/:id` | `204` | `404`, `409` (tiene solicitudes asociadas), `429` |
| `GET` | `/tipos-servicio` · `/tipos-servicio/:id` | `200` | `404` |

Reglas de negocio que valen la pena señalar porque no son evidentes solo leyendo la tabla:

- Una solicitud siempre nace en `PENDIENTE`, sin importar si el `POST` ya trae `tecnicoId`: el
  contrato de creación no acepta `estado` en el body. Para dejarla `ASIGNADA` de una vez hay que
  crearla y luego hacer el `PATCH /estado`.
- `PATCH /estado` a `ASIGNADA`/`EN_PROCESO` sin técnico asignado responde **409**, no 400: el
  body es válido, lo que falla es aplicarlo al estado actual de ese recurso.
- `PUT` que intenta quitarle el técnico (`tecnicoId: null`) a una solicitud `ASIGNADA`/`EN_PROCESO`
  también es **409** por la misma razón.
- `POST`/`PUT` que referencian un `tecnicoId` o `tipoServicioId` inexistente responden **422**
  (Unprocessable Entity): la sintaxis del body es correcta, la referencia no existe.
- `DELETE /tecnicos/:id` con solicitudes asociadas responde **409**. No estaba en la tabla de
  catálogos de solo lectura original — se agregó porque es la única forma de verificar esa regla
  de negocio vía API (el `ON DELETE RESTRICT` de la base la garantiza de todos modos, con o sin
  este endpoint).

Ejemplos reales (`curl -i` literal, sin editar) del ciclo completo de una solicitud —
creación válida, validación fallida, listado filtrado y paginado, conflicto de estado, y
borrado — están en [`docs/ejemplos-api.md`](./docs/ejemplos-api.md).

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
