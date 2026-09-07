import { z } from 'zod';

export const ESTADOS = ['PENDIENTE', 'ASIGNADA', 'EN_PROCESO', 'RESUELTA', 'CANCELADA'] as const;
export const PRIORIDADES = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'] as const;

export type Estado = (typeof ESTADOS)[number];
export type Prioridad = (typeof PRIORIDADES)[number];

// Mapa cerrado de valores permitidos -> fragmento SQL literal. El valor que
// llega del cliente nunca se concatena al ORDER BY; solo se usa como llave
// para buscar en este mapa, así que un valor fuera de la lista simplemente no
// hace match con el enum de Zod antes siquiera de llegar aquí.
export const SORT_VALUES = [
  'fechaCreacion:asc',
  'fechaCreacion:desc',
  'titulo:asc',
  'titulo:desc',
  'prioridad:asc',
  'prioridad:desc',
  'estado:asc',
  'estado:desc',
] as const;

export const SORT_SQL: Record<(typeof SORT_VALUES)[number], string> = {
  'fechaCreacion:asc': 's.fecha_creacion ASC',
  'fechaCreacion:desc': 's.fecha_creacion DESC',
  'titulo:asc': 's.titulo ASC',
  'titulo:desc': 's.titulo DESC',
  'prioridad:asc': 's.prioridad ASC',
  'prioridad:desc': 's.prioridad DESC',
  'estado:asc': 's.estado ASC',
  'estado:desc': 's.estado DESC',
};

export const createSolicitudSchema = z
  .object({
    titulo: z
      .string()
      .trim()
      .min(5, 'El título debe tener entre 5 y 120 caracteres')
      .max(120, 'El título debe tener entre 5 y 120 caracteres'),
    descripcion: z.string().trim().max(2000).nullable().optional(),
    solicitanteNombre: z
      .string()
      .trim()
      .min(3, 'El nombre del solicitante es obligatorio')
      .max(120),
    tecnicoId: z.number().int().positive().nullable().optional(),
    tipoServicioId: z.number().int().positive('tipoServicioId es obligatorio'),
    prioridad: z.enum(PRIORIDADES).default('MEDIA'),
    fechaLimite: z.iso.datetime({ offset: true }).nullable().optional(),
  })
  .strict();

export type CreateSolicitudInput = z.infer<typeof createSolicitudSchema>;

export const updateSolicitudSchema = z
  .object({
    titulo: z.string().trim().min(5).max(120),
    descripcion: z.string().trim().max(2000).nullable(),
    solicitanteNombre: z.string().trim().min(3).max(120),
    tecnicoId: z.number().int().positive().nullable(),
    tipoServicioId: z.number().int().positive(),
    prioridad: z.enum(PRIORIDADES),
    fechaLimite: z.iso.datetime({ offset: true }).nullable(),
  })
  .strict();

export type UpdateSolicitudInput = z.infer<typeof updateSolicitudSchema>;

export const patchEstadoSchema = z
  .object({
    estado: z.enum(ESTADOS),
    comentario: z.string().trim().max(500).nullable().optional(),
  })
  .strict();

export type PatchEstadoInput = z.infer<typeof patchEstadoSchema>;

export const listSolicitudesQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(10),
    q: z.string().trim().min(1).max(120).optional(),
    estado: z.enum(ESTADOS).optional(),
    prioridad: z.enum(PRIORIDADES).optional(),
    tecnicoId: z.coerce.number().int().positive().optional(),
    tipoServicioId: z.coerce.number().int().positive().optional(),
    sort: z.enum(SORT_VALUES).default('fechaCreacion:desc'),
  })
  .strict();

export type ListSolicitudesQuery = z.infer<typeof listSolicitudesQuerySchema>;
