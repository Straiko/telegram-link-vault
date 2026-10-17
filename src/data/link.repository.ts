import { db } from './db';
import {
  LinkItem,
  LinkCreateInput,
  Category,
  CategoryCount,
  VaultStats
} from '@/domain/link.types';

interface DatabaseRow {
  id: number;
  url: string;
  title: string;
  snippet: string;
  category: string;
  tags: string;
  is_read: number;
  original_date: string;
  created_at: string;
}

function mapRowToItem(row: DatabaseRow): LinkItem {
  let parsedTags: string[] = [];
  try {
    parsedTags = JSON.parse(row.tags);
  } catch {
    parsedTags = [];
  }

  return {
    id: row.id,
    url: row.url,
    title: row.title,
    snippet: row.snippet,
    category: row.category as Category,
    tags: parsedTags,
    isRead: row.is_read === 1,
    originalDate: row.original_date,
    createdAt: row.created_at
  };
}

export class LinkRepository {
  public static findAll(params: {
    category?: Category;
    readStatus?: 'all' | 'read' | 'unread';
    query?: string;
    limit?: number;
    offset?: number;
  }): LinkItem[] {
    const conditions: string[] = [];
    const bindings: (string | number)[] = [];

    if (params.category) {
      conditions.push('category = ?');
      bindings.push(params.category);
    }

    if (params.readStatus === 'read') {
      conditions.push('is_read = 1');
    } else if (params.readStatus === 'unread') {
      conditions.push('is_read = 0');
    }

    if (params.query && params.query.trim().length > 0) {
      const sanitized = `%${params.query.trim().toLowerCase()}%`;
      conditions.push('(LOWER(url) LIKE ? OR LOWER(title) LIKE ? OR LOWER(snippet) LIKE ?)');
      bindings.push(sanitized, sanitized, sanitized);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = params.limit ?? 50;
    const offset = params.offset ?? 0;

    const sql = `
      SELECT id, url, title, snippet, category, tags, is_read, original_date, created_at
      FROM links
      ${whereClause}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `;

    bindings.push(limit, offset);

    const stmt = db.prepare(sql);
    const rows = stmt.all(...bindings) as DatabaseRow[];
    return rows.map(mapRowToItem);
  }

  public static countAll(params: {
    category?: Category;
    readStatus?: 'all' | 'read' | 'unread';
    query?: string;
  }): number {
    const conditions: string[] = [];
    const bindings: (string | number)[] = [];

    if (params.category) {
      conditions.push('category = ?');
      bindings.push(params.category);
    }

    if (params.readStatus === 'read') {
      conditions.push('is_read = 1');
    } else if (params.readStatus === 'unread') {
      conditions.push('is_read = 0');
    }

    if (params.query && params.query.trim().length > 0) {
      const sanitized = `%${params.query.trim().toLowerCase()}%`;
      conditions.push('(LOWER(url) LIKE ? OR LOWER(title) LIKE ? OR LOWER(snippet) LIKE ?)');
      bindings.push(sanitized, sanitized, sanitized);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT COUNT(*) as count FROM links ${whereClause}`;

    const stmt = db.prepare(sql);
    const row = stmt.get(...bindings) as { count: number };
    return row.count;
  }

  public static findById(id: number): LinkItem | null {
    const stmt = db.prepare(`
      SELECT id, url, title, snippet, category, tags, is_read, original_date, created_at
      FROM links
      WHERE id = ?
    `);
    const row = stmt.get(id) as DatabaseRow | undefined;
    return row ? mapRowToItem(row) : null;
  }

  public static create(input: LinkCreateInput): LinkItem {
    const stmt = db.prepare(`
      INSERT INTO links (url, title, snippet, category, tags, original_date)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(url) DO UPDATE SET
        snippet = excluded.snippet,
        category = excluded.category
      RETURNING id, url, title, snippet, category, tags, is_read, original_date, created_at
    `);

    const category = input.category ?? 'utilities';
    const tagsJson = JSON.stringify(input.tags ?? []);
    const origDate = input.originalDate ?? new Date().toISOString();

    const row = stmt.get(
      input.url,
      input.title,
      input.snippet,
      category,
      tagsJson,
      origDate
    ) as DatabaseRow;

    return mapRowToItem(row);
  }

  public static batchCreate(inputs: LinkCreateInput[]): number {
    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO links (url, title, snippet, category, tags, original_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction((items: LinkCreateInput[]) => {
      let inserted = 0;
      for (const item of items) {
        const cat = item.category ?? 'utilities';
        const tagsJson = JSON.stringify(item.tags ?? []);
        const origDate = item.originalDate ?? '';
        const res = insertStmt.run(item.url, item.title, item.snippet, cat, tagsJson, origDate);
        if (res.changes > 0) {
          inserted++;
        }
      }
      return inserted;
    });

    return transaction(inputs);
  }

  public static toggleRead(id: number): LinkItem | null {
    const updateStmt = db.prepare(`
      UPDATE links
      SET is_read = CASE WHEN is_read = 1 THEN 0 ELSE 1 END
      WHERE id = ?
      RETURNING id, url, title, snippet, category, tags, is_read, original_date, created_at
    `);

    const row = updateStmt.get(id) as DatabaseRow | undefined;
    return row ? mapRowToItem(row) : null;
  }

  public static deleteById(id: number): boolean {
    const stmt = db.prepare('DELETE FROM links WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  public static getCategoryCounts(): CategoryCount[] {
    const stmt = db.prepare(`
      SELECT category, COUNT(*) as count
      FROM links
      GROUP BY category
      ORDER BY count DESC
    `);

    const rows = stmt.all() as { category: string; count: number }[];
    return rows.map((r) => ({
      category: r.category as Category,
      count: r.count
    }));
  }

  public static getStats(): VaultStats {
    const stmt = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN is_read = 1 THEN 1 ELSE 0 END) as read_count,
        SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread_count
      FROM links
    `);

    const row = stmt.get() as { total: number; read_count: number | null; unread_count: number | null };
    return {
      total: row.total,
      read: row.read_count ?? 0,
      unread: row.unread_count ?? 0
    };
  }
}
