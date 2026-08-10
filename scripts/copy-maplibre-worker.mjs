import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'node_modules', 'maplibre-gl', 'dist');
const outDir = join(root, 'public', 'maplibre');

mkdirSync(outDir, { recursive: true });

for (const file of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  copyFileSync(join(dist, file), join(outDir, file));
}

console.log('Copied MapLibre worker files to public/maplibre/');
