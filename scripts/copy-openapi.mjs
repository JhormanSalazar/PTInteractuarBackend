// tsc no copia assets no-.ts; este script mueve el openapi.yaml a dist/docs
// despues del build para que swagger.ts lo encuentre en produccion igual que
// en desarrollo (donde tsx lo lee directo desde src/docs).
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const src = join(root, '..', 'src', 'docs', 'openapi.yaml');
const destDir = join(root, '..', 'dist', 'docs');

mkdirSync(destDir, { recursive: true });
copyFileSync(src, join(destDir, 'openapi.yaml'));
console.log('[build] copiado openapi.yaml a dist/docs/');
