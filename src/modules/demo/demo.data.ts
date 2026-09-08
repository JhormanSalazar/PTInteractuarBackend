/**
 * Dataset canonico de la demo publica.
 *
 * Es el mismo contenido que db/migrations/002_seed.sql, deliberadamente
 * duplicado aqui por dos razones:
 *
 *  1. Las migraciones son historial inmutable: una vez aplicadas no se editan,
 *     y el runner (db/migrate.ts) las salta si ya estan en schema_migrations.
 *     No sirven como fuente de datos para una operacion de runtime.
 *  2. `npm run build` solo compila TypeScript a dist/; los .sql de db/ no
 *     viajan al bundle serverless de Vercel, asi que leer el archivo con fs en
 *     produccion fallaria. Como constante TypeScript siempre esta disponible.
 *
 * Si se cambia el seed hay que cambiar los dos archivos. El test de integracion
 * tests/integration/demo.test.ts verifica los conteos, asi que un desfase en el
 * numero de filas se detecta.
 */

/** Conteos esperados tras un reset. Se usan en la respuesta y en los tests. */
export const DEMO_COUNTS = {
  tecnicos: 5,
  tiposServicio: 6,
  solicitudes: 17,
} as const;

/** Sentencias que se ejecutan en orden dentro de una unica transaccion. */
export const DEMO_SEED_STATEMENTS: readonly string[] = [
  `INSERT INTO tecnico (nombre, apellido, email, telefono, activo) VALUES
    ('Pedro', 'Pérez', 'pedro.perez@interactuar.org.co', '3001234567', true),
    ('María', 'Gómez', 'maria.gomez@interactuar.org.co', '3007654321', true),
    ('Carlos', 'Ramírez', 'carlos.ramirez@interactuar.org.co', '3012345678', true),
    ('Laura', 'Torres', 'laura.torres@interactuar.org.co', '3019876543', true),
    ('Andrés', 'Muñoz', 'andres.munoz@interactuar.org.co', '3023456789', false)`,

  `INSERT INTO tipo_servicio (nombre, descripcion, sla_horas, activo) VALUES
    ('Mantenimiento Impresora', 'Limpieza, cambio de tóner y ajustes de impresoras de oficina', 24, true),
    ('Instalación de Software', 'Instalación y configuración de licencias en equipos de usuario', 8, true),
    ('Soporte de Red', 'Diagnóstico de conectividad, WiFi y cableado estructurado', 4, true),
    ('Reemplazo de Equipo', 'Cambio de equipo de cómputo por daño o fin de vida útil', 48, true),
    ('Configuración de Correo', 'Configuración de cuentas de correo corporativo en equipos y móviles', 8, true),
    ('Recuperación de Datos', 'Recuperación de archivos por falla de disco o borrado accidental', 72, true)`,

  // Pendientes, sin tecnico asignado.
  `INSERT INTO solicitud (titulo, descripcion, solicitante_nombre, tecnico_id, tipo_servicio_id, estado, prioridad, fecha_creacion, fecha_limite)
   VALUES
    ('Impresora del piso 3 no imprime a color', 'El tóner cian parece agotado, imprime todo en escala de grises.', 'Julián Restrepo', NULL, 1, 'PENDIENTE', 'MEDIA', now() - interval '1 day', now() + interval '2 days'),
    ('Instalar suite ofimática en equipo nuevo', 'Equipo recién entregado a contabilidad, falta el paquete ofimático estándar.', 'Camila Herrera', NULL, 2, 'PENDIENTE', 'BAJA', now() - interval '2 hours', now() + interval '3 days'),
    ('Sin acceso a internet en sala de juntas', 'La WiFi de la sala de juntas del segundo piso no conecta desde ayer.', 'Fernando Ocampo', NULL, 3, 'PENDIENTE', 'ALTA', now() - interval '3 hours', now() + interval '1 day')`,

  // Asignadas.
  `INSERT INTO solicitud (titulo, descripcion, solicitante_nombre, tecnico_id, tipo_servicio_id, estado, prioridad, fecha_creacion, fecha_limite)
   VALUES
    ('Portátil no enciende tras actualización', 'Se quedó en pantalla negra después de una actualización de Windows.', 'Diana Salazar', 1, 4, 'ASIGNADA', 'CRITICA', now() - interval '5 hours', now() + interval '1 day'),
    ('Configurar correo corporativo en celular', 'Nuevo colaborador necesita el correo configurado en su teléfono personal.', 'Esteban Vargas', 2, 5, 'ASIGNADA', 'BAJA', now() - interval '1 day', now() + interval '2 days'),
    ('Impresora de recepción atascada', 'Se traba el papel cada vez que imprime más de dos hojas.', 'Natalia Cárdenas', 3, 1, 'ASIGNADA', 'MEDIA', now() - interval '6 hours', now() + interval '1 day')`,

  // En proceso.
  `INSERT INTO solicitud (titulo, descripcion, solicitante_nombre, tecnico_id, tipo_servicio_id, estado, prioridad, fecha_creacion, fecha_limite)
   VALUES
    ('Recuperar archivos de disco dañado', 'El disco duro del equipo de tesorería empezó a hacer ruido y ya no monta.', 'Ricardo Peña', 1, 6, 'EN_PROCESO', 'CRITICA', now() - interval '2 days', now() + interval '1 day'),
    ('Lentitud generalizada en red del bloque B', 'Varios usuarios reportan navegación muy lenta desde la mañana.', 'Sofía Londoño', 4, 3, 'EN_PROCESO', 'ALTA', now() - interval '4 hours', now() + interval '4 hours'),
    ('Instalar licencia de diseño gráfico', 'Se compró licencia nueva de Adobe para el equipo de mercadeo.', 'Mateo Zapata', 2, 2, 'EN_PROCESO', 'MEDIA', now() - interval '1 day', now() + interval '1 day')`,

  // Resueltas, con notas de cierre.
  `INSERT INTO solicitud (titulo, descripcion, solicitante_nombre, tecnico_id, tipo_servicio_id, estado, prioridad, fecha_creacion, fecha_actualizacion, fecha_limite, notas_cierre)
   VALUES
    ('Cambio de tóner impresora gerencia', 'Tóner agotado, se solicita reemplazo.', 'Alejandra Ruiz', 3, 1, 'RESUELTA', 'BAJA', now() - interval '6 days', now() - interval '5 days', now() - interval '4 days', 'Se cambió el tóner y se realizó limpieza general del rodillo.'),
    ('Equipo de facturación no reconoce el mouse', 'El mouse USB dejó de responder de un momento a otro.', 'Jorge Iván Salcedo', 1, 4, 'RESUELTA', 'MEDIA', now() - interval '5 days', now() - interval '4 days', now() - interval '3 days', 'Puerto USB dañado, se reasignó a otro puerto y quedó funcionando.'),
    ('Configurar impresora en red para diseño', 'Nueva impresora del área de diseño no aparece en los equipos.', 'Valentina Correa', 2, 3, 'RESUELTA', 'MEDIA', now() - interval '4 days', now() - interval '3 days', now() - interval '2 days', 'Se agregó la impresora por IP fija en los tres equipos del área.'),
    ('Migrar correos a nueva cuenta', 'Cambio de apellido en el sistema requiere migrar el historial de correo.', 'Manuela Restrepo', 4, 5, 'RESUELTA', 'BAJA', now() - interval '8 days', now() - interval '7 days', now() - interval '6 days', 'Migración completa sin pérdida de historial, validado con el usuario.'),
    ('Restaurar backup de equipo contable', 'Se necesita restaurar el respaldo de la semana pasada tras un error de sincronización.', 'Sebastián Múnera', 1, 6, 'RESUELTA', 'ALTA', now() - interval '3 days', now() - interval '2 days', now() - interval '1 day', 'Backup restaurado exitosamente, se validó la integridad de los archivos contables.')`,

  // Canceladas.
  `INSERT INTO solicitud (titulo, descripcion, solicitante_nombre, tecnico_id, tipo_servicio_id, estado, prioridad, fecha_creacion, fecha_actualizacion, fecha_limite, notas_cierre)
   VALUES
    ('Instalar software de diseño descontinuado', 'Se pidió instalar una versión que el proveedor ya no soporta.', 'Tomás Escobar', NULL, 2, 'CANCELADA', 'BAJA', now() - interval '7 days', now() - interval '6 days', now() - interval '5 days', 'Se cancela: el proveedor confirmó que la licencia ya no está disponible.'),
    ('Cambio de equipo por preferencia personal', 'El usuario pidió cambio de equipo sin que hubiera falla reportada.', 'Isabella Marín', NULL, 4, 'CANCELADA', 'BAJA', now() - interval '10 days', now() - interval '9 days', now() - interval '8 days', 'No cumple política de reemplazo: se cierra sin acción.'),
    ('Revisión de red duplicada con otro ticket', 'Solicitud de soporte de red que resultó ser la misma reportada por otro usuario.', 'Nicolás Vélez', NULL, 3, 'CANCELADA', 'MEDIA', now() - interval '2 days', now() - interval '1 day', now(), 'Duplicada con la solicitud atendida para el bloque B.')`,
];
