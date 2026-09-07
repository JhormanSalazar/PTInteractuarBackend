import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

// req.query y req.params son getters en Express 5: recalculan un objeto
// nuevo a partir de la URL cada vez que se leen, asi que mutarlos con
// Object.assign no sobrevive al siguiente middleware (verificado con una
// prueba manual, no es un supuesto). El resultado validado/transformado por
// Zod se guarda en req.validatedQuery / req.validatedParams en vez de
// intentar reescribir las propiedades originales. req.body si es una
// propiedad normal (la fija express.json()), por eso a esa se le puede
// reasignar directamente.
export function validateBody(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    req.body = schema.parse(req.body);
    next();
  };
}

export function validateQuery(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    req.validatedQuery = schema.parse(req.query);
    next();
  };
}

export function validateParams(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    req.validatedParams = schema.parse(req.params);
    next();
  };
}
