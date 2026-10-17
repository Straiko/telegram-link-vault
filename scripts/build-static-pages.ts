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
  let items: { id: number; u: string; t: string; s: string; c: string; tags: string[]; d: string; host: string }[] = [];

  const dbPath = path.resolve(process.cwd(), 'data/vault.db');
  const jsonPath = path.resolve(process.cwd(), 'data/seed-links.json');

  const extractHost = (u: string): string => {
    try {
      const h = new URL(u).hostname.replace(/^www\./, '');
      return h;
    } catch {
      return '';
    }
  };

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
          d: r.original_date ? r.original_date.slice(0, 10) : '',
          host: extractHost(r.url)
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
      d: r.original_date ? r.original_date.slice(0, 10) : '',
      host: extractHost(r.url)
    }));
    console.log(`Loaded ${items.length} links from seed-links.json.`);
  }

  console.log(`Building professional minimalist release with ${items.length} total links...`);

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
<title>Telegram Link Vault</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root {
  --bg: #090a0d;
  --panel: #0f1115;
  --surface: #14171d;
  --surface-hover: #1a1e26;
  --border: #1e222b;
  --border-focus: #3b82f6;
  --text: #ededed;
  --text-muted: #848d97;
  --text-dim: #545d68;
  --accent: #2563eb;
  --accent-text: #60a5fa;
  --tag-bg: #141820;
  --tag-border: #232936;
  --tag-text: #9da7b3;
  --success: #238636;
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background-color: var(--bg);
  color: var(--text);
  line-height: 1.5;
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}

.shell {
  max-width: 1280px;
  margin: 0 auto;
  padding: 24px 24px 80px;
}

/* Minimalist Top Bar */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-title {
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.3px;
}

.status-badge {
  font-size: 11px;
  font-weight: 600;
  color: #3fb950;
  background: rgba(35, 134, 54, 0.15);
  border: 1px solid rgba(35, 134, 54, 0.3);
  padding: 2px 8px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  width: 6px;
  height: 6px;
  background: #3fb950;
  border-radius: 50%;
}

.meta-stats {
  display: flex;
  align-items: center;
  gap: 20px;
  font-size: 13px;
  color: var(--text-muted);
}

.meta-stats strong {
  color: var(--text);
  font-weight: 600;
}

.progress-strip {
  width: 90px;
  height: 4px;
  background: var(--surface);
  border-radius: 2px;
  overflow: hidden;
  margin-left: 8px;
  display: inline-block;
  vertical-align: middle;
}

.progress-strip-fill {
  height: 100%;
  background: var(--accent);
  width: 0%;
  transition: width 0.3s;
}

/* Search & Filter Toolbar */
.toolbar {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.search-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-field {
  position: relative;
  flex: 1;
}

.search-field input {
  width: 100%;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 10px 40px 10px 38px;
  color: var(--text);
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;
}

.search-field input:focus {
  border-color: var(--border-focus);
}

.search-icon-svg {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-dim);
  pointer-events: none;
}

.kbd-shortcut {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  color: var(--text-muted);
  padding: 2px 6px;
}

/* Category Filter Bar */
.category-nav {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: thin;
}

.category-nav::-webkit-scrollbar {
  height: 4px;
}
.category-nav::-webkit-scrollbar-thumb {
  background: var(--border);
}

.nav-pill {
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 500;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s;
}

.nav-pill:hover {
  background: var(--surface);
  color: var(--text);
}

.nav-pill.active {
  background: var(--surface);
  color: #ffffff;
  border-color: var(--border);
  font-weight: 600;
}

.pill-count {
  font-size: 11px;
  font-feature-settings: "tnum";
  color: var(--text-dim);
}

.nav-pill.active .pill-count {
  color: var(--text-muted);
}

/* Status & Count Sub-bar */
.sub-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  font-size: 13px;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
  margin-bottom: 16px;
}

.segmented-status {
  display: flex;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 2px;
  gap: 2px;
}

.seg-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}

.seg-btn:hover {
  color: var(--text);
}

.seg-btn.active {
  background: var(--surface);
  color: #ffffff;
  font-weight: 600;
}

/* Feed / Card List */
.feed {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.entry-card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 16px 20px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  transition: border-color 0.15s, background-color 0.15s;
}

.entry-card:hover {
  border-color: #2e3540;
  background: #11141a;
}

.entry-card.is-read {
  opacity: 0.6;
}

.entry-card.is-read .entry-title {
  color: var(--text-muted);
}

.entry-checkbox {
  margin-top: 3px;
  accent-color: var(--success);
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.entry-body {
  flex: 1;
  min-width: 0;
}

.entry-meta-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.cat-tag {
  font-size: 11px;
  font-weight: 600;
  color: var(--tag-text);
  background: var(--tag-bg);
  border: 1px solid var(--tag-border);
  padding: 2px 7px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.domain-tag {
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  color: var(--text-dim);
}

.date-tag {
  font-size: 11px;
  color: var(--text-dim);
  margin-left: auto;
}

.entry-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.4;
  margin-bottom: 4px;
}

.entry-url {
  font-size: 13px;
  color: var(--accent-text);
  text-decoration: none;
  word-break: break-all;
  display: inline-block;
  margin-bottom: 8px;
}

.entry-url:hover {
  text-decoration: underline;
}

.entry-snippet {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-muted);
  white-space: pre-wrap;
  word-break: break-word;
  margin-top: 6px;
}

.expand-btn {
  background: none;
  border: none;
  color: var(--accent-text);
  font-size: 12px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  padding: 4px 0 0 0;
  display: inline-block;
}

.expand-btn:hover {
  text-decoration: underline;
}

.entry-actions {
  display: flex;
  gap: 8px;
  align-self: flex-start;
}

.btn-quiet {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 500;
  padding: 5px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  text-decoration: none;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s;
}

.btn-quiet:hover {
  color: var(--text);
  border-color: #3b4250;
  background: var(--surface);
}

.btn-open {
  background: var(--surface);
  color: var(--text);
  border-color: #2b3340;
}

.btn-open:hover {
  border-color: var(--border-focus);
  color: #ffffff;
}

/* Pagination */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 32px 0 16px;
  border-top: 1px solid var(--border);
  margin-top: 32px;
}

.pager-btn {
  background: var(--panel);
  border: 1px solid var(--border);
  color: var(--text);
  font-size: 13px;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.pager-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.pager-btn:not(:disabled):hover {
  border-color: #3b4250;
  background: var(--surface);
}

.pager-info {
  font-size: 13px;
  color: var(--text-muted);
}

/* Minimalist Toast */
.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: #1c2128;
  border: 1px solid #30363d;
  color: #f0f6fc;
  padding: 10px 16px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 500;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  display: none;
  z-index: 1000;
}

.toast.visible {
  display: block;
}

@media (max-width: 768px) {
  .shell { padding: 16px 12px 60px; }
  .topbar { flex-direction: column; align-items: flex-start; }
  .entry-card { flex-direction: column; padding: 14px; }
  .entry-actions { width: 100%; margin-top: 8px; }
  .btn-quiet { flex: 1; justify-content: center; }
  .date-tag { margin-left: 0; width: 100%; margin-top: 2px; }
}
</style>
</head>
<body>

<div class="shell">
  <!-- Minimalist Top Bar -->
  <header class="topbar">
    <div class="brand">
      <h1 class="brand-title">Telegram Link Vault</h1>
      <span class="status-badge"><span class="status-dot"></span> Sync Active (@whackdoor)</span>
    </div>

    <div class="meta-stats">
      <span>Total: <strong id="stat-total">${items.length.toLocaleString()}</strong></span>
      <span>Read: <strong id="stat-read" style="color:#3fb950">0</strong></span>
      <span>Progress: <strong id="stat-pct">0%</strong>
        <span class="progress-strip"><span class="progress-strip-fill" id="stat-bar"></span></span>
      </span>
    </div>
  </header>

  <!-- Controls Toolbar -->
  <div class="toolbar">
    <div class="search-row">
      <div class="search-field">
        <svg class="search-icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input type="text" id="search-box" placeholder="Search across all ${items.length.toLocaleString()} links, titles, and full guide contents...">
        <span class="kbd-shortcut">/</span>
      </div>
    </div>

    <nav class="category-nav" id="category-nav"></nav>
  </div>

  <!-- Sub-bar (Status + Counters) -->
  <div class="sub-bar">
    <div class="segmented-status">
      <button class="seg-btn active" onclick="setStatus('all', this)">All</button>
      <button class="seg-btn" onclick="setStatus('unread', this)">Unread</button>
      <button class="seg-btn" onclick="setStatus('read', this)">Read</button>
    </div>

    <div style="display:flex; align-items:center; gap:12px;">
      <span id="result-summary">Loading...</span>
      <button class="btn-quiet" onclick="copyPageLinks()">Copy Page</button>
    </div>
  </div>

  <!-- Feed -->
  <main class="feed" id="feed"></main>

  <!-- Pagination -->
  <footer class="pagination">
    <button class="pager-btn" id="btn-prev" onclick="paginate(-1)">Previous</button>
    <span class="pager-info" id="pager-info">Page 1</span>
    <button class="pager-btn" id="btn-next" onclick="paginate(1)">Next</button>
  </footer>
</div>

<div id="toast" class="toast">Link copied to clipboard</div>

<script>
const ITEMS = ${JSON.stringify(items)};
let currentCategory = 'all';
let currentStatus = 'all';
let query = '';
let page = 1;
const PER_PAGE = 50;

let filtered = [];

const readKey = 'vault_read_v1';
const readSet = new Set(JSON.parse(localStorage.getItem(readKey) || '[]'));

function showToast(text) {
  const el = document.getElementById('toast');
  el.innerText = text;
  el.classList.add('visible');
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    el.classList.remove('visible');
  }, 2000);
}

function updateProgress() {
  const total = ITEMS.length;
  const read = readSet.size;
  document.getElementById('stat-total').innerText = total.toLocaleString();
  document.getElementById('stat-read').innerText = read.toLocaleString();
  const pct = total > 0 ? ((read / total) * 100).toFixed(1) : '0';
  document.getElementById('stat-pct').innerText = pct + '%';
  document.getElementById('stat-bar').style.width = pct + '%';
}

function initCategories() {
  const counts = { all: ITEMS.length };
  ITEMS.forEach(item => {
    counts[item.c] = (counts[item.c] || 0) + 1;
  });

  const nav = document.getElementById('category-nav');
  nav.innerHTML = '';

  const allBtn = document.createElement('button');
  allBtn.className = 'nav-pill active';
  allBtn.innerHTML = 'All <span class="pill-count">(' + counts.all.toLocaleString() + ')</span>';
  allBtn.onclick = () => selectCategory('all', allBtn);
  nav.appendChild(allBtn);

  Object.keys(counts).filter(k => k !== 'all').sort((a,b) => counts[b] - counts[a]).forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'nav-pill';
    btn.innerHTML = formatCategory(cat) + ' <span class="pill-count">(' + counts[cat].toLocaleString() + ')</span>';
    btn.onclick = () => selectCategory(cat, btn);
    nav.appendChild(btn);
  });
}

function formatCategory(c) {
  const map = {
    'ai-models': 'AI Models',
    'dev-tools': 'Dev Tools',
    'articles': 'Articles',
    'gaming': 'Gaming',
    'media': 'Media',
    'apps': 'Apps',
    'telegram': 'Telegram',
    'social': 'Social',
    'utilities': 'Utilities'
  };
  return map[c] || c;
}

function selectCategory(cat, btn) {
  currentCategory = cat;
  document.querySelectorAll('.nav-pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  page = 1;
  filterData();
}

function setStatus(status, btn) {
  currentStatus = status;
  document.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  page = 1;
  filterData();
}

function filterData() {
  const q = query.toLowerCase().trim();

  filtered = ITEMS.filter(item => {
    if (currentCategory !== 'all' && item.c !== currentCategory) return false;
    const isRead = readSet.has(item.u);
    if (currentStatus === 'read' && !isRead) return false;
    if (currentStatus === 'unread' && isRead) return false;

    if (!q) return true;

    return (
      item.u.toLowerCase().includes(q) ||
      (item.t && item.t.toLowerCase().includes(q)) ||
      (item.s && item.s.toLowerCase().includes(q)) ||
      (item.tags && item.tags.some(t => t.toLowerCase().includes(q))) ||
      (item.host && item.host.toLowerCase().includes(q))
    );
  });

  render();
  updateProgress();
}

function render() {
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  if (page > totalPages) page = totalPages;

  const start = (page - 1) * PER_PAGE;
  const end = Math.min(start + PER_PAGE, total);
  const slice = filtered.slice(start, end);

  document.getElementById('result-summary').innerText = total === 0
    ? 'No results'
    : 'Showing ' + (start + 1).toLocaleString() + '–' + end.toLocaleString() + ' of ' + total.toLocaleString();

  document.getElementById('pager-info').innerText = 'Page ' + page + ' of ' + totalPages;
  document.getElementById('btn-prev').disabled = page <= 1;
  document.getElementById('btn-next').disabled = page >= totalPages;

  const feed = document.getElementById('feed');

  if (slice.length === 0) {
    feed.innerHTML = '<div style="text-align:center; padding:56px 0; color:var(--text-dim); background:var(--panel); border-radius:var(--radius-md); border:1px solid var(--border)">No matching items found.</div>';
    return;
  }

  feed.innerHTML = slice.map(item => {
    const isRead = readSet.has(item.u);
    const domainHtml = item.host ? '<span class="domain-tag">' + escapeHtml(item.host) + '</span>' : '';
    const dateHtml = item.d ? '<span class="date-tag">' + escapeHtml(item.d) + '</span>' : '';
    const titleText = item.t && item.t !== item.u ? escapeHtml(item.t) : '';
    
    const isLong = item.s && item.s.length > 280;
    const shortSnippet = isLong ? item.s.substring(0, 280) + '...' : item.s;

    return '<article class="entry-card ' + (isRead ? 'is-read' : '') + '">' +
      '<input type="checkbox" class="entry-checkbox" ' + (isRead ? 'checked' : '') + ' onchange="toggleItemRead(this, \\'' + escapeJs(item.u) + '\\')" title="Toggle read status">' +
      '<div class="entry-body">' +
        '<div class="entry-meta-top">' +
          '<span class="cat-tag">' + formatCategory(item.c) + '</span>' +
          domainHtml +
          dateHtml +
        '</div>' +
        (titleText ? '<h2 class="entry-title">' + titleText + '</h2>' : '') +
        '<a href="' + escapeHtml(item.u) + '" target="_blank" rel="noopener noreferrer" class="entry-url">' + escapeHtml(item.u) + '</a>' +
        (item.s ? '<div class="entry-snippet" id="snippet-' + item.id + '">' +
          '<span>' + escapeHtml(shortSnippet) + '</span>' +
          (isLong ? '<br><button class="expand-btn" onclick="toggleSnippet(' + item.id + ')">Show full text (' + item.s.length + ' chars)</button>' : '') +
        '</div>' : '') +
      '</div>' +
      '<div class="entry-actions">' +
        '<button class="btn-quiet" onclick="copyLink(\\'' + escapeJs(item.u) + '\\')">Copy</button>' +
        '<a href="' + escapeHtml(item.u) + '" target="_blank" rel="noopener noreferrer" class="btn-quiet btn-open">Open ↗</a>' +
      '</div>' +
    '</article>';
  }).join('');
}

function toggleSnippet(id) {
  const item = ITEMS.find(i => i.id === id);
  if (!item) return;
  const box = document.getElementById('snippet-' + id);
  if (!box) return;

  if (box.getAttribute('data-expanded') === 'true') {
    box.setAttribute('data-expanded', 'false');
    box.innerHTML = '<span>' + escapeHtml(item.s.substring(0, 280) + '...') + '</span>' +
      '<br><button class="expand-btn" onclick="toggleSnippet(' + id + ')">Show full text (' + item.s.length + ' chars)</button>';
  } else {
    box.setAttribute('data-expanded', 'true');
    box.innerHTML = '<span>' + escapeHtml(item.s) + '</span>' +
      '<br><button class="expand-btn" onclick="toggleSnippet(' + id + ')">Collapse</button>';
  }
}

function toggleItemRead(cb, url) {
  const card = cb.closest('.entry-card');
  if (cb.checked) {
    readSet.add(url);
    card.classList.add('is-read');
    showToast('Marked as read');
  } else {
    readSet.delete(url);
    card.classList.remove('is-read');
    showToast('Marked as unread');
  }
  localStorage.setItem(readKey, JSON.stringify(Array.from(readSet)));
  updateProgress();
}

function copyLink(url) {
  navigator.clipboard.writeText(url).then(() => {
    showToast('Link copied to clipboard');
  });
}

function copyPageLinks() {
  const start = (page - 1) * PER_PAGE;
  const slice = filtered.slice(start, start + PER_PAGE);
  const text = slice.map(i => i.u + (i.t ? ' — ' + i.t : '')).join('\\n');
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copied ' + slice.length + ' links to clipboard');
  });
}

function paginate(delta) {
  page += delta;
  render();
  window.scrollTo({ top: 80, behavior: 'smooth' });
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeJs(str) {
  return str.replace(/'/g, "\\\\'");
}

const searchInput = document.getElementById('search-box');
searchInput.addEventListener('input', (e) => {
  query = e.target.value;
  page = 1;
  filterData();
});

window.addEventListener('keydown', (e) => {
  if (e.key === '/' && document.activeElement !== searchInput) {
    e.preventDefault();
    searchInput.focus();
  }
});

initCategories();
filterData();
</script>
</body>
</html>`;

  fs.writeFileSync(path.join(distDir, 'index.html'), html, 'utf-8');
  console.log(`✅ Generated professional minimalist release: ${distDir}/index.html (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
