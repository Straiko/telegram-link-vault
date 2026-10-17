import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'vault.db');

export const db = new Database(DB_PATH);

// Enable Write-Ahead Logging for high concurrency read/write
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    snippet TEXT NOT NULL,
    category TEXT NOT NULL,
    tags TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    original_date TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_links_category ON links(category);
  CREATE INDEX IF NOT EXISTS idx_links_is_read ON links(is_read);
  CREATE INDEX IF NOT EXISTS idx_links_created ON links(created_at DESC);
`);
