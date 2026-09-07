const TYPE_BASE = 'https://api.local/errors';

export interface FieldError {
  field: string;
  message: string;
}

/**
 * Error de dominio/HTTP tipado. El errorHandler central lo traduce a un
 * documento RFC 9457 Problem Details; el resto del código nunca construye la
 * forma de la respuesta HTTP directamente, solo lanza AppError.
 */
export class AppError extends Error {
  readonly status: number;
  readonly type: string;
  readonly title: string;
  readonly detail?: string;
  readonly errors?: FieldError[];

  constructor(params: {
    status: number;
    type: string;
    title: string;
    detail?: string;
    errors?: FieldError[];
  }) {
    super(params.title);
    this.name = 'AppError';
    this.status = params.status;
    this.type = `${TYPE_BASE}/${params.type}`;
    this.title = params.title;
    this.detail = params.detail;
    this.errors = params.errors;
  }

  static validation(errors: FieldError[], detail = 'Revise los campos indicados'): AppError {
    return new AppError({
      status: 400,
      type: 'validation-error',
      title: 'Los datos enviados no son válidos',
      detail,
      errors,
    });
  }

  static notFound(detail: string): AppError {
    return new AppError({ status: 404, type: 'not-found', title: 'Recurso no encontrado', detail });
  }

  static conflict(detail: string): AppError {
    return new AppError({
      status: 409,
      type: 'conflict',
      title: 'Conflicto con el estado actual del recurso',
      detail,
    });
  }

  static unprocessable(detail: string, errors?: FieldError[]): AppError {
    return new AppError({
      status: 422,
      type: 'unprocessable-entity',
      title: 'La solicitud no se puede procesar',
      detail,
      errors,
    });
  }
}
