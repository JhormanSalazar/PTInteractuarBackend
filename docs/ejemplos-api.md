# Ejemplos reales de la API

Todas las salidas de abajo son **literales** (`curl -s -i`, sin editar) y se tomaron contra la
**URL pública desplegada**, no contra localhost:

```
https://interactuar-backend.vercel.app/api/v1
```

Fecha de captura: **2026-09-07, 23:34–23:38 (UTC-5)**.

Se omiten de los encabezados mostrados las cabeceras de ruido que `helmet` añade a todas las
respuestas (`Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`,
`X-Frame-Options`, `Cross-Origin-*`, `Referrer-Policy`, …) y las de Vercel (`X-Vercel-Id`,
`Server`, `Date`, `Etag`). **Sí están presentes en la respuesta real** — hay una captura
completa y sin filtrar en el ejemplo 2, precisamente para poder comprobarlo.

---

## 1. `POST /solicitudes` — solicitud válida (201 + `Location`)

```
$ curl -s -i -X POST https://interactuar-backend.vercel.app/api/v1/solicitudes \
  -H "Content-Type: application/json" \
  -d '{"titulo":"Configurar VPN para trabajo remoto","solicitanteNombre":"Daniela Ortiz","tipoServicioId":3,"prioridad":"ALTA"}'

HTTP/1.1 201 Created
Content-Length: 369
Content-Type: application/json; charset=utf-8
Location: /api/v1/solicitudes/18
Ratelimit-Limit: 300
Ratelimit-Policy: 300;w=900
Ratelimit-Remaining: 299
Ratelimit-Reset: 900
X-Trace-Id: 4bf0f4b1-dec5-4738-a46d-085ed9076fa7

{"id":18,"codigo":"SOL-2026-0018","titulo":"Configurar VPN para trabajo remoto","descripcion":null,"solicitanteNombre":"Daniela Ortiz","estado":"PENDIENTE","prioridad":"ALTA","tecnico":null,"tipoServicio":{"id":3,"nombre":"Soporte de Red"},"fechaCreacion":"2026-09-08T04:34:30.097Z","fechaActualizacion":"2026-09-08T04:34:30.097Z","fechaLimite":null,"notasCierre":null}
```

Puntos a notar:

- El `codigo` (`SOL-2026-0018`) lo genera la base de datos por `DEFAULT`, con una secuencia
  propia: es atómico incluso con inserciones concurrentes, la aplicación no lo calcula.
- Nace en `PENDIENTE` aunque el request no menciona el estado: el contrato de creación no
  expone `estado`, así que no se puede crear una solicitud ya `ASIGNADA`.
- `Location` apunta al recurso recién creado, como manda la semántica de `201`.

## 2. `POST /solicitudes` — inválida, tres campos mal (400 con detalle por campo)

Esta es la **respuesta completa, sin filtrar ninguna cabecera**, para que se vean todas las de
seguridad que aplica `helmet` en cada respuesta:

```
$ curl -s -i -X POST https://interactuar-backend.vercel.app/api/v1/solicitudes \
  -H "Content-Type: application/json" \
  -d '{"titulo":"abc","solicitanteNombre":"X"}'

HTTP/1.1 400 Bad Request
Cache-Control: public, max-age=0, must-revalidate
Content-Length: 493
Content-Security-Policy: default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests
Content-Type: application/json; charset=utf-8
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Origin-Agent-Cluster: ?1
Ratelimit-Limit: 300
Ratelimit-Policy: 300;w=900
Ratelimit-Remaining: 298
Ratelimit-Reset: 900
Referrer-Policy: no-referrer
Strict-Transport-Security: max-age=31536000; includeSubDomains
Vary: Origin
X-Content-Type-Options: nosniff
X-Dns-Prefetch-Control: off
X-Download-Options: noopen
X-Frame-Options: SAMEORIGIN
X-Permitted-Cross-Domain-Policies: none
X-Trace-Id: 19a65568-d410-4042-a4bd-9ad8b6adaa64
X-Xss-Protection: 0

{"type":"https://api.local/errors/validation-error","title":"Los datos enviados no son válidos","status":400,"detail":"Revise los campos indicados","instance":"/api/v1/solicitudes","traceId":"19a65568-d410-4042-a4bd-9ad8b6adaa64","errors":[{"field":"titulo","message":"El título debe tener entre 5 y 120 caracteres"},{"field":"solicitanteNombre","message":"El nombre del solicitante es obligatorio"},{"field":"tipoServicioId","message":"Invalid input: expected number, received undefined"}]}
```

`titulo` demasiado corto, `solicitanteNombre` demasiado corto y `tipoServicioId` ausente: los
tres errores llegan juntos en un solo Problem Details, uno por campo. El frontend usa
exactamente ese arreglo `errors[]` para pintar el mensaje sobre el campo que lo causó, en vez
de mostrar un toast genérico.

## 3. `GET /solicitudes` — dos filtros combinados

```
$ curl -s -i "https://interactuar-backend.vercel.app/api/v1/solicitudes?estado=RESUELTA&prioridad=BAJA&page=1&pageSize=10"

HTTP/1.1 200 OK
Content-Length: 1180
Content-Type: application/json; charset=utf-8
Ratelimit-Limit: 1000
Ratelimit-Remaining: 999
X-Trace-Id: f25143e5-bda0-4b42-8277-4bdcb868d66f

{"data":[{"id":10,"codigo":"SOL-2026-0010","titulo":"Cambio de tóner impresora gerencia","descripcion":"Tóner agotado, se solicita reemplazo.","solicitanteNombre":"Alejandra Ruiz","estado":"RESUELTA","prioridad":"BAJA","tecnico":{"id":3,"nombreCompleto":"Carlos Ramírez"},"tipoServicio":{"id":1,"nombre":"Mantenimiento Impresora"},"fechaCreacion":"2026-09-02T04:34:29.603Z","fechaActualizacion":"2026-09-03T04:34:29.603Z","fechaLimite":"2026-09-04T04:34:29.603Z","notasCierre":"Se cambió el tóner y se realizó limpieza general del rodillo."},{"id":13,"codigo":"SOL-2026-0013","titulo":"Migrar correos a nueva cuenta","descripcion":"Cambio de apellido en el sistema requiere migrar el historial de correo.","solicitanteNombre":"Manuela Restrepo","estado":"RESUELTA","prioridad":"BAJA","tecnico":{"id":4,"nombreCompleto":"Laura Torres"},"tipoServicio":{"id":5,"nombre":"Configuración de Correo"},"fechaCreacion":"2026-08-31T04:34:29.603Z","fechaActualizacion":"2026-09-01T04:34:29.603Z","fechaLimite":"2026-09-02T04:34:29.603Z","notasCierre":"Migración completa sin pérdida de historial, validado con el usuario."}],"meta":{"page":1,"pageSize":10,"total":2,"totalPages":1}}
```

`estado=RESUELTA` y `prioridad=BAJA` se combinan con `AND` en SQL: de las 17 solicitudes
sembradas, solo estas 2 cumplen ambos a la vez.

## 4. `GET /solicitudes?q=…` — búsqueda por texto parcial

```
$ curl -s -i "https://interactuar-backend.vercel.app/api/v1/solicitudes?q=impresora&page=1&pageSize=3&sort=titulo:asc"

HTTP/1.1 200 OK
Content-Length: 1664
Content-Type: application/json; charset=utf-8
X-Trace-Id: 034927b6-a41f-4d72-a372-b7e90168760f

{"data":[ … 3 solicitudes … ],"meta":{"page":1,"pageSize":3,"total":4,"totalPages":2}}
```

El término aparece indistintamente en `titulo` (`Impresora de recepción atascada`) y a mitad de
palabra (`Cambio de tóner impresora gerencia`, `Configurar impresora en red para diseño`): es
un `ILIKE '%termino%'` apoyado en los índices GIN de `pg_trgm`, no un prefijo. `total: 4` con
`pageSize: 3` produce `totalPages: 2`, así que la paginación se calcula sobre el conjunto
filtrado, no sobre la tabla entera.

## 5. `PUT /solicitudes/:id` — edición completa, asignando técnico

```
$ curl -s -i -X PUT https://interactuar-backend.vercel.app/api/v1/solicitudes/18 \
  -H "Content-Type: application/json" \
  -d '{"titulo":"Configurar VPN para trabajo remoto (ampliado)","descripcion":"Se suman dos equipos del area comercial.","solicitanteNombre":"Daniela Ortiz","tecnicoId":4,"tipoServicioId":3,"prioridad":"CRITICA","fechaLimite":null}'

HTTP/1.1 200 OK
Content-Length: 457
Content-Type: application/json; charset=utf-8
Ratelimit-Limit: 300
Ratelimit-Remaining: 299
X-Trace-Id: c216098a-2a99-4c3f-84b3-5617e619b9f6

{"id":18,"codigo":"SOL-2026-0018","titulo":"Configurar VPN para trabajo remoto (ampliado)","descripcion":"Se suman dos equipos del area comercial.","solicitanteNombre":"Daniela Ortiz","estado":"PENDIENTE","prioridad":"CRITICA","tecnico":{"id":4,"nombreCompleto":"Laura Torres"},"tipoServicio":{"id":3,"nombre":"Soporte de Red"},"fechaCreacion":"2026-09-08T04:34:30.097Z","fechaActualizacion":"2026-09-08T04:34:53.452Z","fechaLimite":null,"notasCierre":null}
```

`fechaActualizacion` cambió sola (`04:34:30` → `04:34:53`) sin que el `UPDATE` la mencione: la
mantiene un trigger `BEFORE UPDATE` en la base, para que no dependa de que la aplicación se
acuerde. `estado` sigue en `PENDIENTE`: el `PUT` edita los datos, los cambios de estado van por
`PATCH /:id/estado`.

## 6. `PATCH /solicitudes/:id/estado` — regla de negocio (409)

```
$ curl -s -i -X PATCH https://interactuar-backend.vercel.app/api/v1/solicitudes/1/estado \
  -H "Content-Type: application/json" -d '{"estado":"EN_PROCESO"}'
# la solicitud 1 esta PENDIENTE y sin tecnico asignado

HTTP/1.1 409 Conflict
Content-Length: 328
Content-Type: application/json; charset=utf-8
X-Trace-Id: db9b1ce8-d363-4300-ad24-f5ce8038107e

{"type":"https://api.local/errors/conflict","title":"Conflicto con el estado actual del recurso","status":409,"detail":"No se puede pasar a EN_PROCESO sin un técnico asignado. Asigna un técnico primero (PUT) y luego cambia el estado.","instance":"/api/v1/solicitudes/1/estado","traceId":"db9b1ce8-d363-4300-ad24-f5ce8038107e"}
```

`409` y no `400`: el cuerpo es sintácticamente válido y `EN_PROCESO` es un estado legítimo. Lo
que falla es aplicarlo **al estado actual de este recurso concreto**. La misma regla está
además grabada como `CHECK` en la tabla (`solicitud_estado_requiere_tecnico`), así que ni un
`INSERT` manual por `psql` puede saltársela.

## 7. `DELETE /solicitudes/:id` — 204 sin cuerpo, y el 404 posterior

```
$ curl -s -i -X DELETE https://interactuar-backend.vercel.app/api/v1/solicitudes/18

HTTP/1.1 204 No Content
Ratelimit-Limit: 300
Ratelimit-Remaining: 297
X-Trace-Id: 78c020e6-1288-4284-8afc-338759fdfd3e

$ curl -s -i https://interactuar-backend.vercel.app/api/v1/solicitudes/18

HTTP/1.1 404 Not Found
Content-Length: 220
Content-Type: application/json; charset=utf-8
X-Trace-Id: 60df68e9-c7fa-472c-8224-df92f92854ce

{"type":"https://api.local/errors/not-found","title":"Recurso no encontrado","status":404,"detail":"No existe una solicitud con id 18","instance":"/api/v1/solicitudes/18","traceId":"60df68e9-c7fa-472c-8224-df92f92854ce"}
```

El `204` no lleva `Content-Type` ni cuerpo. El `404` posterior confirma que el borrado fue real.

## 8. `POST /demo/reset` — restauración de la demo y su rate limit

```
$ curl -s -i -X POST https://interactuar-backend.vercel.app/api/v1/demo/reset

HTTP/1.1 200 OK
Content-Length: 97
Content-Type: application/json; charset=utf-8
Ratelimit-Limit: 3
Ratelimit-Policy: 3;w=900
Ratelimit-Remaining: 2
Ratelimit-Reset: 900
X-Trace-Id: e499c6cc-b463-436e-a493-2e51937a6059

{"mensaje":"Datos de demostración restaurados.","tecnicos":5,"tiposServicio":6,"solicitudes":17}
```

`Ratelimit-Limit: 3` frente a los `300` de las escrituras normales y los `1000` del límite
global: es el límite propio y mucho más estricto de este endpoint. A la cuarta llamada dentro
de la misma ventana de 15 minutos:

```
$ curl -s -i -X POST https://interactuar-backend.vercel.app/api/v1/demo/reset

HTTP/1.1 429 Too Many Requests
Ratelimit-Remaining: 0
X-Trace-Id: bd70cebb-bdba-4c98-95f7-0fd508a91871

{"type":"https://api.local/errors/rate-limited","title":"Demasiadas peticiones","status":429,"detail":"Se superó el límite de peticiones permitido. Intenta de nuevo en unos minutos.","instance":"/api/v1/demo/reset","traceId":"bd70cebb-bdba-4c98-95f7-0fd508a91871"}
```

## 9. CORS por allowlist — comprobado en producción

Preflight desde el origen del frontend desplegado:

```
$ curl -s -i -X OPTIONS https://interactuar-backend.vercel.app/api/v1/demo/reset \
  -H "Origin: https://interactuar-frontend.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type"

HTTP/1.1 204 No Content
Access-Control-Allow-Headers: content-type
Access-Control-Allow-Methods: GET,HEAD,PUT,PATCH,POST,DELETE
Access-Control-Allow-Origin: https://interactuar-frontend.vercel.app
```

La misma petición desde un origen que no está en la allowlist:

```
$ curl -s -i "https://interactuar-backend.vercel.app/api/v1/solicitudes?pageSize=1" \
  -H "Origin: https://sitio-no-autorizado.example"

HTTP/1.1 200 OK
(sin cabecera Access-Control-Allow-Origin)
```

El servidor responde, pero **sin** `Access-Control-Allow-Origin`, así que el navegador bloquea
la lectura de la respuesta desde ese origen. Es el comportamiento correcto de una allowlist:
CORS es una política del navegador, no un cortafuegos del servidor — quien necesite bloquear
clientes que no son navegadores usa autenticación, no CORS.
