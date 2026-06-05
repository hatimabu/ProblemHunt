import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { pool } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(schema);
    console.log('[OK] Database schema applied');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => {
  console.error('[ERROR] Migration failed:', err.message);
  process.exit(1);
});
