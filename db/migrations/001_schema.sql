-- Esquema de dominio: tecnico, tipo_servicio, solicitud, solicitud_historial.
-- Ver docs/PLAN-DESARROLLO.md seccion 2 para el diagrama ER y las decisiones.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- tecnico
-- ============================================================================
CREATE TABLE tecnico (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  telefono TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- tipo_servicio
-- ============================================================================
CREATE TABLE tipo_servicio (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  sla_horas INTEGER NOT NULL CHECK (sla_horas > 0),
  activo BOOLEAN NOT NULL DEFAULT true
);

-- ============================================================================
-- solicitud
-- ============================================================================
-- Secuencia propia (en vez de dejar que "codigo" dependa de la logica de la
-- aplicacion) para que la unicidad y el formato SOL-YYYY-NNNN sean atomicos
-- incluso con inserciones concurrentes.
CREATE SEQUENCE solicitud_codigo_seq;

CREATE TABLE solicitud (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE
    DEFAULT ('SOL-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('solicitud_codigo_seq')::text, 4, '0')),
  titulo TEXT NOT NULL CHECK (char_length(titulo) BETWEEN 5 AND 120),
  descripcion TEXT,
  solicitante_nombre TEXT NOT NULL,
  tecnico_id BIGINT REFERENCES tecnico (id) ON DELETE RESTRICT,
  tipo_servicio_id BIGINT NOT NULL REFERENCES tipo_servicio (id) ON DELETE RESTRICT,
  estado TEXT NOT NULL DEFAULT 'PENDIENTE'
    CHECK (estado IN ('PENDIENTE', 'ASIGNADA', 'EN_PROCESO', 'RESUELTA', 'CANCELADA')),
  prioridad TEXT NOT NULL DEFAULT 'MEDIA'
    CHECK (prioridad IN ('BAJA', 'MEDIA', 'ALTA', 'CRITICA')),
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_limite TIMESTAMPTZ,
  notas_cierre TEXT,
  -- Regla de negocio (tambien reforzada en el service, ver src/modules/solicitudes):
  -- una solicitud ASIGNADA o EN_PROCESO siempre debe tener tecnico asignado.
  CONSTRAINT solicitud_estado_requiere_tecnico CHECK (
    estado NOT IN ('ASIGNADA', 'EN_PROCESO') OR tecnico_id IS NOT NULL
  )
);

CREATE INDEX idx_solicitud_tecnico_id ON solicitud (tecnico_id);
CREATE INDEX idx_solicitud_tipo_servicio_id ON solicitud (tipo_servicio_id);
CREATE INDEX idx_solicitud_estado ON solicitud (estado);
CREATE INDEX idx_solicitud_fecha_creacion ON solicitud (fecha_creacion DESC);
-- GIN + pg_trgm: soporta busqueda por texto parcial (ILIKE '%termino%') con
-- rendimiento de indice en vez de un seq scan sobre toda la tabla.
CREATE INDEX idx_solicitud_titulo_trgm ON solicitud USING gin (titulo gin_trgm_ops);
CREATE INDEX idx_solicitud_solicitante_trgm ON solicitud USING gin (solicitante_nombre gin_trgm_ops);

-- ============================================================================
-- solicitud_historial — trazabilidad de reasignaciones y cambios de estado
-- ============================================================================
CREATE TABLE solicitud_historial (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  solicitud_id BIGINT NOT NULL REFERENCES solicitud (id) ON DELETE CASCADE,
  estado_anterior TEXT,
  estado_nuevo TEXT NOT NULL,
  tecnico_id_anterior BIGINT,
  tecnico_id_nuevo BIGINT,
  comentario TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_solicitud_historial_solicitud_id ON solicitud_historial (solicitud_id);

-- ============================================================================
-- Triggers: mantienen *_actualizado_en sin depender de que la app lo recuerde.
-- ============================================================================
CREATE FUNCTION set_tecnico_actualizado_en() RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tecnico_actualizado_en
  BEFORE UPDATE ON tecnico
  FOR EACH ROW
  EXECUTE FUNCTION set_tecnico_actualizado_en();

CREATE FUNCTION set_solicitud_fecha_actualizacion() RETURNS TRIGGER AS $$
BEGIN
  NEW.fecha_actualizacion := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_solicitud_fecha_actualizacion
  BEFORE UPDATE ON solicitud
  FOR EACH ROW
  EXECUTE FUNCTION set_solicitud_fecha_actualizacion();
