import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'collection.db');
const SCHEMA_PATH = path.join(process.cwd(), 'db', 'schema.sql');

declare global {
  // eslint-disable-next-line no-var
  var __cardDb: Database.Database | undefined;
}

interface ColumnDef {
  name: string;
  type: string;
}

/**
 * `CREATE TABLE IF NOT EXISTS` (what schema.sql relies on everywhere) is a
 * no-op against a table that already exists, so it never retrofits new
 * columns onto an existing database file. This adds any columns missing
 * from `table` - safe to call on every boot. SQLite has no `ADD COLUMN IF
 * NOT EXISTS`, so each ALTER is wrapped to swallow only a "duplicate column
 * name" error, in case two processes ever race to add the same column.
 */
function ensureColumns(connection: Database.Database, table: string, columns: ColumnDef[]): void {
  const existing = new Set((connection.pragma(`table_info(${table})`) as { name: string }[]).map((c) => c.name));

  for (const column of columns) {
    if (existing.has(column.name)) continue;

    try {
      connection.exec(`ALTER TABLE ${table} ADD COLUMN ${column.name} ${column.type}`);
    } catch (err) {
      if (!(err instanceof Error) || !err.message.includes('duplicate column name')) {
        throw err;
      }
    }
  }
}

function createConnection(): Database.Database {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const connection = new Database(DB_PATH);
  connection.pragma('journal_mode = WAL');
  connection.pragma('foreign_keys = ON');

  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  connection.exec(schema);

  ensureColumns(connection, 'collection_items', [
    { name: 'printing_external_id', type: 'TEXT' },
    { name: 'printing_set_code', type: 'TEXT' },
    { name: 'printing_image_url', type: 'TEXT' },
    { name: 'printing_attributes', type: 'TEXT' },
  ]);

  return connection;
}

// Next.js reloads route modules on every request in dev mode. Without this,
// that would open a fresh SQLite file handle each time. Stashing it on the
// global object keeps one connection alive across reloads.
export const db = global.__cardDb ?? createConnection();

if (process.env.NODE_ENV !== 'production') {
  global.__cardDb = db;
}
