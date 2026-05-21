// Copies src/migrations/*.sql to dist/migrations/ after tsc.
// tsc ignores non-TS files; without this, runMigrations() can't find the SQL.

import { cpSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, '..', 'src', 'migrations');
const dst = resolve(here, '..', 'dist', 'migrations');

cpSync(src, dst, { recursive: true });
console.log(`[build] copied ${src} -> ${dst}`);
