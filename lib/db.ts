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

function createConnection(): Database.Database {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const connection = new Database(DB_PATH);
  connection.pragma('journal_mode = WAL');
  connection.pragma('foreign_keys = ON');

  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  connection.exec(schema);

  return connection;
}

// Next.js reloads route modules on every request in dev mode. Without this,
// that would open a fresh SQLite file handle each time. Stashing it on the
// global object keeps one connection alive across reloads.
export const db = global.__cardDb ?? createConnection();

if (process.env.NODE_ENV !== 'production') {
  global.__cardDb = db;
}
