import { runMigrations, pool } from './db.js';

await runMigrations();
await pool.end();
console.log('[db] migrations complete');
