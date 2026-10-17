import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

interface LinkItemRecord {
  id: number;
  url: string;
  title: string;
  snippet: string;
  category: string;
  tags: string[];
  original_date: string;
}

async function main(): Promise<void> {
  let items: { id: number; u: string; t: string; s: string; c: string; tags: string[]; d: string }[] = [];

  const dbPath = path.resolve(process.cwd(), 'data/vault.db');
  const jsonPath = path.resolve(process.cwd(), 'data/seed-links.json');

  if (fs.existsSync(dbPath)) {
    try {
      const db = new Database(dbPath);
      const rows = db.prepare('SELECT id, url, title, snippet, category, tags, original_date FROM links ORDER BY id DESC').all() as any[];
      items = rows.map((r) => {
        let tags: string[] = [];
        try {
          tags = JSON.parse(r.tags);
        } catch {
          tags = [];
        }
        return {
          id: r.id,
          u: r.url,
          t: r.title,
          s: r.snippet,
          c: r.category,
          tags,
          d: r.original_date ? r.original_date.slice(0, 10) : ''
        };
      });
      console.log(`Loaded ${items.length} links from SQLite database.`);
    } catch (err) {
      console.warn('Could not read from SQLite, falling back to seed-links.json:', err);
    }
  }

  if (items.length === 0 && fs.existsSync(jsonPath)) {
    const raw = fs.readFileSync(jsonPath, 'utf-8');
    const records = JSON.parse(raw) as LinkItemRecord[];
    items = records.map((r) => ({
      id: r.id,
      u: r.url,
      t: r.title,
      s: r.snippet,
      c: r.category,
      tags: r.tags || [],
      d: r.original_date ? r.original_date.slice(0, 10) : ''
    }));
    console.log(`Loaded ${items.length} links from seed-links.json.`);
  }

  console.log(`Building refined GitHub Pages release with ${items.length} total links...`);

  const distDir = path.resolve(process.cwd(), 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  fs.writeFileSync(path.join(distDir, '.nojekyll'), '', 'utf-8');

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Telegram Link Vault — Умный архив каналов и ссылок</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root {
  --bg: #080c15;
  --surface: #101726;
  --surface-hover: #162035;
  --surface-card: rgba(16, 23, 38, 0.78);
  --border: rgba(255, 255, 255, 0.08);
  --border-focus: #6366f1;
  --text-main: #f8fafc;
  --text-secondary: #cbd5e1;
  --text-muted: #8492a6;
  --accent: #6366f1;
  --accent-cyan: #38bdf8;
  --accent-gradient: linear-gradient(135deg, #6366f1 0%, #38bdf8 100%);
  --success: #10b981;
  --success-glow: rgba(16, 185, 129, 0.2);
  --radius-sm: 8px;
  --radius-md: 14px;
  --radius-lg: 20px;
  --shadow-card: 0 4px 20px -2px rgba(0, 0, 0, 0.4);
  --shadow-hover: 0 14px 34px -4px rgba(0, 0, 0, 0.6), 0 0 20px -2px rgba(99, 102, 241, 0.15);
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background-color: var(--bg);
  background-image: 
    radial-gradient(circle at 10% 10%, rgba(99, 102, 241, 0.12) 0%, transparent 45%),
    radial-gradient(circle at 90% 70%, rgba(56, 189, 248, 0.08) 0%, transparent 50%),
    linear-gradient(180deg, #090e18 0%, #060911 100%);
  background-attachment: fixed;
  color: var(--text-main);
  line-height: 1.6;
  min-height: 100vh;
  padding: 32px 20px 80px;
  -webkit-font-smoothing: antialiased;
}

.app-wrapper {
  max-width: 1160px;
  margin: 0 auto;
}

/* Glassmorphic Header */
.vault-header {
  background: var(--surface-card);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 24px 32px;
  margin-bottom: 24px;
  box-shadow: var(--shadow-card);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 24px;
}

.brand-section {
  display: flex;
  align-items: center;
  gap: 18px;
}

.brand-icon-box {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: var(--accent-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.35);
  flex-shrink: 0;
}

.brand-text h1 {
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.5px;
  color: #ffffff;
  display: flex;
  align-items: center;
  gap: 12px;
}

.live-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #34d399;
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.25);
  padding: 3px 10px;
  border-radius: 20px;
}

.live-dot {
  width: 7px;
  height: 7px;
  background: #10b981;
  border-radius: 50%;
  box-shadow: 0 0 10px #10b981;
  animation: pulse-live 2s infinite ease-in-out;
}

@keyframes pulse-live {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.85); }
}

.brand-subtitle {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 2px;
}

/* Stats Progress Widget */
.stats-widget {
  display: flex;
  align-items: center;
  gap: 24px;
  background: rgba(10, 15, 28, 0.65);
  border: 1px solid var(--border);
  padding: 12px 22px;
  border-radius: var(--radius-md);
}

.stat-pill {
  display: flex;
  flex-direction: column;
}

.stat-num {
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
  font-feature-settings: "tnum";
}

.stat-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
  font-weight: 600;
}

.progress-track {
  width: 110px;
  height: 8px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  overflow: hidden;
  margin-top: 6px;
}

.progress-fill {
  height: 100%;
  background: var(--accent-gradient);
  border-radius: 4px;
  width: 0%;
  transition: width 0.4s ease;
}

/* Sticky Filter & Search Control Center */
.control-center {
  position: sticky;
  top: 16px;
  z-index: 100;
  background: rgba(8, 12, 21, 0.88);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px 20px;
  margin-bottom: 24px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.search-bar-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-box {
  position: relative;
  flex: 1;
}

.search-icon {
  position: absolute;
  left: 18px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  font-size: 16px;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 14px 44px 14px 48px;
  background: rgba(16, 23, 38, 0.85);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: #ffffff;
  font-size: 15px;
  font-family: inherit;
  outline: none;
  transition: all 0.25s ease;
}

.search-input:focus {
  border-color: var(--accent-cyan);
  background: rgba(20, 29, 48, 0.95);
  box-shadow: 0 0 20px rgba(56, 189, 248, 0.25);
}

.search-input::placeholder {
  color: var(--text-muted);
}

.search-clear-btn {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 14px;
  cursor: pointer;
  display: none;
  padding: 4px;
}

.search-clear-btn:hover {
  color: #ffffff;
}

/* Category Filter Chips */
.category-strip {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
}

.category-strip::-webkit-scrollbar {
  height: 5px;
}
.category-strip::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.12);
  border-radius: 4px;
}

.chip-btn {
  background: rgba(16, 23, 38, 0.7);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  padding: 8px 16px;
  border-radius: 24px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.chip-btn:hover {
  background: var(--surface-hover);
  color: #ffffff;
  border-color: rgba(255, 255, 255, 0.2);
}

.chip-btn.active {
  background: var(--accent-gradient);
  color: #ffffff;
  border-color: transparent;
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.35);
}

.chip-count {
  font-size: 11px;
  opacity: 0.8;
  font-weight: 700;
  background: rgba(0, 0, 0, 0.25);
  padding: 2px 7px;
  border-radius: 12px;
}

/* Secondary Filter / Action Bar */
.filter-subbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
  padding: 0 4px;
  font-size: 13px;
  color: var(--text-muted);
}

.status-pill-group {
  display: flex;
  background: rgba(16, 23, 38, 0.6);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 3px;
  gap: 4px;
}

.status-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  padding: 5px 12px;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.status-btn:hover {
  color: #ffffff;
}

.status-btn.active {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

/* Link Cards List */
.cards-stream {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.vault-card {
  background: var(--surface-card);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 22px 26px;
  display: flex;
  align-items: flex-start;
  gap: 18px;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: var(--shadow-card);
}

.vault-card:hover {
  border-color: rgba(99, 102, 241, 0.4);
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
  background: rgba(20, 28, 46, 0.82);
}

.vault-card.is-read {
  opacity: 0.62;
  filter: grayscale(0.2);
}

.vault-card.is-read .card-title,
.vault-card.is-read .card-url-link {
  text-decoration: line-through;
  color: var(--text-muted);
}

.check-col {
  padding-top: 4px;
}

.custom-checkbox {
  appearance: none;
  -webkit-appearance: none;
  width: 22px;
  height: 22px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  background: rgba(10, 15, 28, 0.8);
  cursor: pointer;
  display: grid;
  place-content: center;
  transition: all 0.2s ease;
}

.custom-checkbox:hover {
  border-color: var(--success);
}

.custom-checkbox:checked {
  background: var(--success);
  border-color: var(--success);
  box-shadow: 0 0 12px var(--success-glow);
}

.custom-checkbox:checked::before {
  content: "✓";
  color: #0b0f19;
  font-size: 13px;
  font-weight: 900;
}

.card-main {
  flex: 1;
  min-width: 0;
}

.card-meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.cat-badge {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  padding: 3px 10px;
  border-radius: 6px;
}

/* Category specific hues */
.cat-ai-models { background: rgba(139, 92, 246, 0.15); color: #c4b5fd; border: 1px solid rgba(139, 92, 246, 0.3); }
.cat-dev-tools { background: rgba(6, 182, 212, 0.15); color: #67e8f9; border: 1px solid rgba(6, 182, 212, 0.3); }
.cat-gaming    { background: rgba(16, 185, 129, 0.15); color: #6ee7b7; border: 1px solid rgba(16, 185, 129, 0.3); }
.cat-media     { background: rgba(244, 63, 94, 0.15); color: #fda4af; border: 1px solid rgba(244, 63, 94, 0.3); }
.cat-articles  { background: rgba(245, 158, 11, 0.15); color: #fde68a; border: 1px solid rgba(245, 158, 11, 0.3); }
.cat-apps      { background: rgba(59, 130, 246, 0.15); color: #93c5fd; border: 1px solid rgba(59, 130, 246, 0.3); }
.cat-telegram  { background: rgba(34, 197, 94, 0.15); color: #86efac; border: 1px solid rgba(34, 197, 94, 0.3); }
.cat-social    { background: rgba(236, 72, 153, 0.15); color: #f9a8d4; border: 1px solid rgba(236, 72, 153, 0.3); }
.cat-utilities { background: rgba(148, 163, 184, 0.15); color: #cbd5e1; border: 1px solid rgba(148, 163, 184, 0.3); }

.tag-pill {
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  color: var(--text-muted);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 2px 7px;
  border-radius: 6px;
}

.date-text {
  font-size: 12px;
  color: var(--text-muted);
  margin-left: auto;
  font-feature-settings: "tnum";
}

.card-title {
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
  line-height: 1.45;
  margin-bottom: 8px;
  letter-spacing: -0.2px;
}

.card-url-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--accent-cyan);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  word-break: break-all;
  margin-bottom: 12px;
  transition: color 0.15s;
}

.card-url-link:hover {
  color: #7dd3fc;
  text-decoration: underline;
}

/* Full Post Reading Accordion */
.full-post-body {
  background: rgba(8, 12, 22, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-left: 4px solid var(--accent);
  border-radius: var(--radius-sm);
  padding: 14px 18px;
  font-size: 14.5px;
  color: var(--text-secondary);
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
  margin-top: 8px;
}

.expand-toggle-btn {
  background: none;
  border: none;
  color: var(--accent-cyan);
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 0;
  transition: color 0.2s;
}

.expand-toggle-btn:hover {
  color: #ffffff;
  text-decoration: underline;
}

/* Card Actions */
.card-actions-col {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 2px;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: rgba(16, 23, 38, 0.8);
  color: var(--text-main);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: var(--surface-hover);
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.action-btn-primary {
  background: var(--accent-gradient);
  color: #ffffff;
  border-color: transparent;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.action-btn-primary:hover {
  box-shadow: 0 6px 18px rgba(99, 102, 241, 0.5);
}

/* Pagination Bar */
.pagination-shelf {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid var(--border);
}

.page-nav-btn {
  padding: 10px 20px;
  border-radius: var(--radius-sm);
  background: var(--surface-card);
  border: 1px solid var(--border);
  color: #ffffff;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.page-nav-btn:hover:not(:disabled) {
  background: var(--accent-gradient);
  border-color: transparent;
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.35);
}

.page-nav-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.page-indicator-text {
  font-size: 14px;
  color: var(--text-muted);
  font-feature-settings: "tnum";
}

/* Floating Toast Feedback */
.toast-notice {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: rgba(16, 23, 38, 0.95);
  backdrop-filter: blur(16px);
  border: 1px solid var(--accent);
  color: #ffffff;
  padding: 12px 20px;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 1000;
  transform: translateY(100px);
  opacity: 0;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-notice.show {
  transform: translateY(0);
  opacity: 1;
}

@media (max-width: 768px) {
  body { padding: 16px 12px 60px; }
  .vault-header { padding: 20px; flex-direction: column; align-items: flex-start; }
  .stats-widget { width: 100%; justify-content: space-between; }
  .vault-card { flex-direction: column; padding: 16px; }
  .card-actions-col { flex-direction: row; width: 100%; margin-top: 8px; }
  .action-btn { flex: 1; }
  .date-text { margin-left: 0; width: 100%; margin-top: 4px; }
}
</style>
</head>
<body>

<div class="app-wrapper">
  <!-- Header -->
  <header class="vault-header">
    <div class="brand-section">
      <div class="brand-icon-box">⚡</div>
      <div class="brand-text">
        <h1>Telegram Link Vault <span class="live-indicator"><span class="live-dot"></span> Live Channel Sync</span></h1>
        <p class="brand-subtitle">Автоматический архив полезных ссылок и полных постов из Telegram (@whackdoor)</p>
      </div>
    </div>

    <div class="stats-widget">
      <div class="stat-pill">
        <span class="stat-num" id="stat-total">${items.length.toLocaleString()}</span>
        <span class="stat-label">Всего ссылок</span>
      </div>
      <div class="stat-pill">
        <span class="stat-num" id="stat-read" style="color:#10b981">0</span>
        <span class="stat-label">Прочитано</span>
      </div>
      <div>
        <div class="stat-label">Прогресс <span id="stat-pct">0%</span></div>
        <div class="progress-track">
          <div class="progress-fill" id="progress-bar"></div>
        </div>
      </div>
    </div>
  </header>

  <!-- Sticky Controls Center -->
  <div class="control-center">
    <div class="search-bar-row">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input type="text" id="vault-search" class="search-input" placeholder="Поиск среди всех ${items.length.toLocaleString()} ссылок, заголовков, тегов и полных постов...">
        <button id="search-clear" class="search-clear-btn" title="Очистить поиск">✕</button>
      </div>
    </div>

    <div class="category-strip" id="category-strip"></div>
  </div>

  <!-- Secondary Bar -->
  <div class="filter-subbar">
    <div class="status-pill-group">
      <button class="status-btn active" onclick="setStatusFilter('all', this)">Все</button>
      <button class="status-btn" onclick="setStatusFilter('unread', this)">Непрочитанные</button>
      <button class="status-btn" onclick="setStatusFilter('read', this)">Прочитанные</button>
    </div>

    <div style="display:flex; align-items:center; gap:12px;">
      <span id="counter-summary">Загрузка...</span>
      <button class="action-btn" onclick="copyCurrentPageLinks()">📋 Скопировать страницу</button>
    </div>
  </div>

  <!-- Links Grid / Stream -->
  <main class="cards-stream" id="cards-stream"></main>

  <!-- Pagination -->
  <footer class="pagination-shelf">
    <button class="page-nav-btn" id="btn-prev" onclick="goToPage(-1)">← Назад</button>
    <span class="page-indicator-text" id="page-display">Страница 1</span>
    <button class="page-nav-btn" id="btn-next" onclick="goToPage(1)">Вперед →</button>
  </footer>
</div>

<!-- Floating Toast -->
<div id="toast" class="toast-notice">
  <span>✓</span> <span id="toast-msg">Ссылка скопирована в буфер!</span>
</div>

<script>
const DATA = ${JSON.stringify(items)};
let activeCategory = 'all';
let activeStatus = 'all'; // all | unread | read
let searchTerm = '';
let currentPage = 1;
const PER_PAGE = 50;

let filtered = [];

const CATEGORY_META = {
  'all':        { label: 'Все категории', icon: '✨' },
  'ai-models':  { label: 'Нейросети & AI', icon: '🤖' },
  'dev-tools':  { label: 'Разработка & Git', icon: '💻' },
  'gaming':     { label: 'Игры & Steam', icon: '🎮' },
  'media':      { label: 'Видео & Стримы', icon: '🎬' },
  'articles':   { label: 'Статьи & Чтиво', icon: '📖' },
  'apps':       { label: 'Приложения', icon: '📱' },
  'telegram':   { label: 'Телеграм', icon: '💬' },
  'social':     { label: 'Соцсети', icon: '🌐' },
  'utilities':  { label: 'Инструменты & Web', icon: '🛠' }
};

const readStorageKey = 'vault_read_v1';
const readItems = new Set(JSON.parse(localStorage.getItem(readStorageKey) || '[]'));

function showToast(text) {
  const t = document.getElementById('toast');
  const msg = document.getElementById('toast-msg');
  msg.innerText = text;
  t.classList.add('show');
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    t.classList.remove('show');
  }, 2200);
}

function updateStats() {
  const total = DATA.length;
  const readCount = readItems.size;
  document.getElementById('stat-total').innerText = total.toLocaleString();
  document.getElementById('stat-read').innerText = readCount.toLocaleString();
  const pct = total > 0 ? ((readCount / total) * 100).toFixed(1) : '0';
  document.getElementById('stat-pct').innerText = pct + '%';
  document.getElementById('progress-bar').style.width = pct + '%';
}

function initCategoryChips() {
  const counts = { all: DATA.length };
  DATA.forEach(i => { counts[i.c] = (counts[i.c] || 0) + 1; });

  const strip = document.getElementById('category-strip');
  strip.innerHTML = '';

  const allMeta = CATEGORY_META['all'];
  const allBtn = document.createElement('button');
  allBtn.className = 'chip-btn active';
  allBtn.innerHTML = allMeta.icon + ' ' + allMeta.label + ' <span class="chip-count">' + counts.all.toLocaleString() + '</span>';
  allBtn.onclick = () => setCategoryFilter('all', allBtn);
  strip.appendChild(allBtn);

  Object.keys(counts).filter(k => k !== 'all').sort((a,b) => counts[b] - counts[a]).forEach(cat => {
    const meta = CATEGORY_META[cat] || { label: cat, icon: '📌' };
    const btn = document.createElement('button');
    btn.className = 'chip-btn';
    btn.innerHTML = meta.icon + ' ' + meta.label + ' <span class="chip-count">' + counts[cat].toLocaleString() + '</span>';
    btn.onclick = () => setCategoryFilter(cat, btn);
    strip.appendChild(btn);
  });
}

function setCategoryFilter(cat, btn) {
  activeCategory = cat;
  document.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentPage = 1;
  applyFilters();
}

function setStatusFilter(status, btn) {
  activeStatus = status;
  document.querySelectorAll('.status-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentPage = 1;
  applyFilters();
}

function applyFilters() {
  const q = searchTerm.toLowerCase().trim();

  filtered = DATA.filter(item => {
    if (activeCategory !== 'all' && item.c !== activeCategory) {
      return false;
    }
    const isRead = readItems.has(item.u);
    if (activeStatus === 'read' && !isRead) return false;
    if (activeStatus === 'unread' && isRead) return false;

    if (!q) return true;

    return (
      item.u.toLowerCase().includes(q) ||
      (item.t && item.t.toLowerCase().includes(q)) ||
      (item.s && item.s.toLowerCase().includes(q)) ||
      (item.tags && item.tags.some(tag => tag.toLowerCase().includes(q)))
    );
  });

  renderCards();
  updateStats();
}

function renderCards() {
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * PER_PAGE;
  const end = Math.min(start + PER_PAGE, total);
  const pageItems = filtered.slice(start, end);

  document.getElementById('counter-summary').innerText = total === 0
    ? 'Ничего не найдено'
    : 'Показано ' + (start + 1).toLocaleString() + '–' + end.toLocaleString() + ' из ' + total.toLocaleString() + ' ссылок';

  document.getElementById('page-display').innerText = 'Страница ' + currentPage + ' из ' + totalPages;
  document.getElementById('btn-prev').disabled = currentPage <= 1;
  document.getElementById('btn-next').disabled = currentPage >= totalPages;

  const container = document.getElementById('cards-stream');

  if (pageItems.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:72px 0; color:var(--text-muted); background:var(--surface-card); border-radius:var(--radius-md); border:1px solid var(--border)">' +
      '<div style="font-size:40px; margin-bottom:12px;">🔍</div>' +
      '<h3 style="color:#ffffff; margin-bottom:6px;">По вашему запросу ничего не найдено</h3>' +
      '<p>Попробуйте изменить поисковый запрос или выбрать другую категорию.</p>' +
    '</div>';
    return;
  }

  container.innerHTML = pageItems.map(item => {
    const isChecked = readItems.has(item.u);
    const catClass = 'cat-' + item.c;
    const catMeta = CATEGORY_META[item.c] || { label: item.c, icon: '📌' };
    const dateFormatted = item.d || '';
    const tagsHtml = (item.tags || []).map(t => '<span class="tag-pill">#' + escapeHtml(t) + '</span>').join(' ');

    const titleText = item.t && item.t !== item.u ? escapeHtml(item.t) : '';
    const isLong = item.s && item.s.length > 320;
    const snippetPreview = isLong ? item.s.substring(0, 320) + '...' : item.s;

    return '<article class="vault-card ' + (isChecked ? 'is-read' : '') + '">' +
      '<div class="check-col">' +
        '<input type="checkbox" class="custom-checkbox" ' + (isChecked ? 'checked' : '') + ' onchange="toggleRead(this, \\'' + escapeJs(item.u) + '\\')" title="Отметить как прочитанное">' +
      '</div>' +
      '<div class="card-main">' +
        '<div class="card-meta-row">' +
          '<span class="cat-badge ' + catClass + '">' + catMeta.icon + ' ' + escapeHtml(catMeta.label) + '</span> ' +
          tagsHtml +
          (dateFormatted ? '<span class="date-text">📅 ' + dateFormatted + '</span>' : '') +
        '</div>' +
        (titleText ? '<h2 class="card-title">' + titleText + '</h2>' : '') +
        '<a href="' + escapeHtml(item.u) + '" target="_blank" rel="noopener noreferrer" class="card-url-link">🔗 ' + escapeHtml(item.u) + '</a>' +
        (item.s ? '<div class="full-post-body" id="post-' + item.id + '">' +
          '<span class="text-content">' + escapeHtml(snippetPreview) + '</span>' +
          (isLong ? '<br><button class="expand-toggle-btn" onclick="toggleExpand(' + item.id + ')">▼ Читать полный пост целиком</button>' : '') +
        '</div>' : '') +
      '</div>' +
      '<div class="card-actions-col">' +
        '<button class="action-btn" onclick="copyLinkUrl(\\'' + escapeJs(item.u) + '\\')">📋 Копировать</button>' +
        '<a href="' + escapeHtml(item.u) + '" target="_blank" rel="noopener noreferrer" class="action-btn action-btn-primary">↗ Открыть</a>' +
      '</div>' +
    '</article>';
  }).join('');
}

function toggleExpand(id) {
  const item = DATA.find(i => i.id === id);
  if (!item) return;
  const box = document.getElementById('post-' + id);
  if (!box) return;

  if (box.getAttribute('data-expanded') === 'true') {
    box.setAttribute('data-expanded', 'false');
    box.innerHTML = '<span class="text-content">' + escapeHtml(item.s.substring(0, 320) + '...') + '</span>' +
      '<br><button class="expand-toggle-btn" onclick="toggleExpand(' + id + ')">▼ Читать полный пост целиком</button>';
  } else {
    box.setAttribute('data-expanded', 'true');
    box.innerHTML = '<span class="text-content">' + escapeHtml(item.s) + '</span>' +
      '<br><button class="expand-toggle-btn" onclick="toggleExpand(' + id + ')">▲ Свернуть текст</button>';
  }
}

function toggleRead(cb, url) {
  const card = cb.closest('.vault-card');
  if (cb.checked) {
    readItems.add(url);
    card.classList.add('is-read');
    showToast('Отмечено как прочитанное');
  } else {
    readItems.delete(url);
    card.classList.remove('is-read');
    showToast('Снята отметка о прочтении');
  }
  localStorage.setItem(readStorageKey, JSON.stringify(Array.from(readItems)));
  updateStats();
}

function copyLinkUrl(url) {
  navigator.clipboard.writeText(url).then(() => {
    showToast('✓ Ссылка скопирована в буфер обмена!');
  }).catch(() => {
    showToast('Ошибка при копировании');
  });
}

function copyCurrentPageLinks() {
  const start = (currentPage - 1) * PER_PAGE;
  const pageItems = filtered.slice(start, start + PER_PAGE);
  const text = pageItems.map(i => i.u + (i.t ? ' — ' + i.t : '')).join('\\n');
  navigator.clipboard.writeText(text).then(() => {
    showToast('✓ Скопировано ' + pageItems.length + ' ссылок со страницы!');
  });
}

function goToPage(delta) {
  currentPage += delta;
  renderCards();
  window.scrollTo({ top: 120, behavior: 'smooth' });
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeJs(str) {
  return str.replace(/'/g, "\\\\'");
}

const searchInput = document.getElementById('vault-search');
const clearBtn = document.getElementById('search-clear');

searchInput.addEventListener('input', (e) => {
  searchTerm = e.target.value;
  clearBtn.style.display = searchTerm.length > 0 ? 'block' : 'none';
  currentPage = 1;
  applyFilters();
});

clearBtn.addEventListener('click', () => {
  searchInput.value = '';
  searchTerm = '';
  clearBtn.style.display = 'none';
  currentPage = 1;
  applyFilters();
  searchInput.focus();
});

// Keyboard shortcut '/' to search
window.addEventListener('keydown', (e) => {
  if (e.key === '/' && document.activeElement !== searchInput) {
    e.preventDefault();
    searchInput.focus();
  }
});

initCategoryChips();
applyFilters();
</script>
</body>
</html>`;

  fs.writeFileSync(path.join(distDir, 'index.html'), html, 'utf-8');
  console.log(`✅ Generated refined GitHub Pages release: ${distDir}/index.html (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
