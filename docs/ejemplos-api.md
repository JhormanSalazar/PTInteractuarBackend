# Ejemplos reales de la API

**Nota importante sobre dónde se corrió esto:** al momento de este bloque de trabajo el
despliegue en Vercel + Neon seguía bloqueado por dos cosas que dependen de una acción manual
en una plataforma externa (ver el reporte del bloque): no había sesión iniciada en la Vercel
CLI (`vercel whoami` → `Logged out`) y no existía todavía un proyecto de Neon con su cadena de
conexión. La secuencia de abajo se corrió contra el mismo código, compilado
(`npm run build && npm start`), sirviendo `GET /api/v1/health` con `"database":"ok"` contra una
Postgres real (no una base en memoria ni mockeada). En cuanto existan la URL pública y la
cadena de Neon, esta misma secuencia se repite tal cual contra el dominio de Vercel y se
reemplaza este archivo — el código no cambia, solo la URL base.

Todas las salidas de abajo son literales (`curl -i`, sin editar), salvo las cabeceras propias
de `helmet`/`cors`/`rate-limit` que se omitieron por ruido visual (CSP, HSTS, `Vary`,
`RateLimit-*`, etc. — sí están presentes en la respuesta real).

---

## 1. POST /api/v1/solicitudes — solicitud válida (201 + Location)

```
$ curl -i -X POST http://localhost:3000/api/v1/solicitudes \
  -H "Content-Type: application/json" \
  -d '{"titulo":"Configurar VPN para trabajo remoto","solicitanteNombre":"Daniela Ortiz","tipoServicioId":3,"prioridad":"ALTA"}'

HTTP/1.1 201 Created
X-Trace-Id: 16a18dc6-504b-4c3d-a813-55e54d721b72
Location: /api/v1/solicitudes/18
Content-Type: application/json; charset=utf-8
Content-Length: 369

{"id":18,"codigo":"SOL-2026-0018","titulo":"Configurar VPN para trabajo remoto","descripcion":null,"solicitanteNombre":"Daniela Ortiz","estado":"PENDIENTE","prioridad":"ALTA","tecnico":null,"tipoServicio":{"id":3,"nombre":"Soporte de Red"},"fechaCreacion":"2026-09-07T23:09:07.588Z","fechaActualizacion":"2026-09-07T23:09:07.588Z","fechaLimite":null,"notasCierre":null}
```

Nótese: nace en `PENDIENTE` aunque el request no menciona el estado — el contrato no permite
crear una solicitud ya `ASIGNADA`/`EN_PROCESO` directamente (ver decisión en el reporte).

## 2. POST /api/v1/solicitudes — inválida, dos campos mal (400 con detalle por campo)

```
$ curl -i -X POST http://localhost:3000/api/v1/solicitudes \
  -H "Content-Type: application/json" \
  -d '{"titulo":"abc","solicitanteNombre":"X"}'

HTTP/1.1 400 Bad Request
X-Trace-Id: b9a1bd07-88c6-44e1-967e-33e35a8e43b4
Content-Type: application/json; charset=utf-8
Content-Length: 493

{"type":"https://api.local/errors/validation-error","title":"Los datos enviados no son válidos","status":400,"detail":"Revise los campos indicados","instance":"/api/v1/solicitudes","traceId":"b9a1bd07-88c6-44e1-967e-33e35a8e43b4","errors":[{"field":"titulo","message":"El título debe tener entre 5 y 120 caracteres"},{"field":"solicitanteNombre","message":"El nombre del solicitante es obligatorio"},{"field":"tipoServicioId","message":"Invalid input: expected number, received undefined"}]}
```

`titulo` demasiado corto, `solicitanteNombre` demasiado corto y `tipoServicioId` ausente: tres
errores, uno por campo, en un solo Problem Details.

## 3. GET /api/v1/solicitudes — listado con dos filtros y paginación

```
$ curl -i "http://localhost:3000/api/v1/solicitudes?estado=RESUELTA&prioridad=BAJA&page=1&pageSize=10"

HTTP/1.1 200 OK
X-Trace-Id: f2a610fd-fea3-42b3-8a2b-6e4ad960b863
Content-Type: application/json; charset=utf-8
Content-Length: 1180

{"data":[{"id":10,"codigo":"SOL-2026-0010","titulo":"Cambio de tóner impresora gerencia","descripcion":"Tóner agotado, se solicita reemplazo.","solicitanteNombre":"Alejandra Ruiz","estado":"RESUELTA","prioridad":"BAJA","tecnico":{"id":3,"nombreCompleto":"Carlos Ramírez"},"tipoServicio":{"id":1,"nombre":"Mantenimiento Impresora"},"fechaCreacion":"2026-09-01T23:08:26.017Z","fechaActualizacion":"2026-09-02T23:08:26.017Z","fechaLimite":"2026-09-03T23:08:26.017Z","notasCierre":"Se cambió el tóner y se realizó limpieza general del rodillo."},{"id":13,"codigo":"SOL-2026-0013","titulo":"Migrar correos a nueva cuenta","descripcion":"Cambio de apellido en el sistema requiere migrar el historial de correo.","solicitanteNombre":"Manuela Restrepo","estado":"RESUELTA","prioridad":"BAJA","tecnico":{"id":4,"nombreCompleto":"Laura Torres"},"tipoServicio":{"id":5,"nombre":"Configuración de Correo"},"fechaCreacion":"2026-08-30T23:08:26.017Z","fechaActualizacion":"2026-08-31T23:08:26.017Z","fechaLimite":"2026-09-01T23:08:26.017Z","notasCierre":"Migración completa sin pérdida de historial, validado con el usuario."}],"meta":{"page":1,"pageSize":10,"total":2,"totalPages":1}}
```

Los dos filtros (`estado=RESUELTA` y `prioridad=BAJA`) se combinan con `AND` en SQL — de las 17
solicitudes sembradas, solo estas 2 cumplen ambos a la vez.

## 4. PATCH /api/v1/solicitudes/:id/estado — pasar a EN_PROCESO sin técnico (409)

```
$ curl -i -X PATCH http://localhost:3000/api/v1/solicitudes/18/estado \
  -H "Content-Type: application/json" \
  -d '{"estado":"EN_PROCESO"}'
# la solicitud 18 es la creada en el paso 1: PENDIENTE y sin tecnico asignado

HTTP/1.1 409 Conflict
X-Trace-Id: a4d0f8a9-0345-4a03-be5b-3351cd827025
Content-Type: application/json; charset=utf-8
Content-Length: 329

{"type":"https://api.local/errors/conflict","title":"Conflicto con el estado actual del recurso","status":409,"detail":"No se puede pasar a EN_PROCESO sin un técnico asignado. Asigna un técnico primero (PUT) y luego cambia el estado.","instance":"/api/v1/solicitudes/18/estado","traceId":"a4d0f8a9-0345-4a03-be5b-3351cd827025"}
```

409, no 400: el body es sintácticamente válido, lo que falla es aplicarlo al estado actual de
este recurso puntual (regla de negocio explícita del enunciado).

## 5. DELETE /api/v1/solicitudes/:id — eliminar solicitud existente (204 sin cuerpo)

```
$ curl -i -X DELETE http://localhost:3000/api/v1/solicitudes/18

HTTP/1.1 204 No Content
X-Trace-Id: 06c6c6f2-14ed-44f5-af07-0242545a1eee

```

Sin `Content-Type` ni cuerpo: `res.status(204).send()` en el controller.
