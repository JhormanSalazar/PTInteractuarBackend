import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';

const openapiPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'openapi.yaml');
const openapiDocument = YAML.parse(readFileSync(openapiPath, 'utf8')) as Record<string, unknown>;

export function mountSwagger(app: Express): void {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiDocument));
}
