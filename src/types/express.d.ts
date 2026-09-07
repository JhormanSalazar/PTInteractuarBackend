export {};

declare global {
  namespace Express {
    interface Request {
      traceId: string;
      // req.query y req.params son getters en Express 5 (recalculan un
      // objeto nuevo desde la URL en cada acceso); mutarlos con
      // Object.assign no persiste entre middlewares. Los datos ya validados
      // y transformados por Zod (coerciones, defaults) viajan aqui en vez
      // de intentar reescribir las propiedades originales.
      validatedQuery?: unknown;
      validatedParams?: unknown;
    }
  }
}
