import { runMigrations, pool } from './db.js';

void (async () => {
  await runMigrations();
  await pool.end();
  console.log('[db] migrations complete');
})();
