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

  console.log(`Building GitHub Pages release with ${items.length} total links...`);

  const distDir = path.resolve(process.cwd(), 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // Add .nojekyll so GitHub Pages does not ignore underscore files
  fs.writeFileSync(path.join(distDir, '.nojekyll'), '', 'utf-8');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Telegram Link Vault — Live Release</title>
<style>
:root {
  --bg: #0a0f1d;
  --card-bg: #121a2f;
  --card-border: #27375a;
  --text: #f8fafc;
  --text-muted: #94a3b8;
  --accent: #38bdf8;
  --accent-hover: #0ea5e9;
  --success: #10b981;
  --tag-bg: #1b2642;
  --radius: 12px;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
  padding: 24px 20px;
}
.app-container {
  max-width: 1100px;
  margin: 0 auto;
}
header {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--card-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}
.title-group h1 {
  font-size: 26px;
  font-weight: 800;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 12px;
}
.badge-total {
  background: rgba(56, 189, 248, 0.15);
  color: var(--accent);
  border: 1px solid var(--accent);
  font-size: 13px;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 20px;
}
.progress-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  padding: 10px 18px;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 13px;
}
.progress-bar-bg {
  width: 100px;
  height: 8px;
  background: var(--tag-bg);
  border-radius: 4px;
  overflow: hidden;
}
.progress-bar-fill {
  height: 100%;
  width: 0%;
  background: var(--success);
  transition: width 0.3s;
}
.controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
  position: sticky;
  top: 12px;
  z-index: 100;
  background: rgba(10, 15, 29, 0.95);
  backdrop-filter: blur(12px);
  padding: 12px 0;
}
.search-input {
  width: 100%;
  padding: 14px 20px 14px 44px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius);
  color: #fff;
  font-size: 15px;
  outline: none;
  box-shadow: 0 4px 16px rgba(0,0,0,0.25);
  transition: border-color 0.2s;
}
.search-input:focus {
  border-color: var(--accent);
}
.category-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}
.category-tabs::-webkit-scrollbar { height: 4px; }
.category-tabs::-webkit-scrollbar-thumb { background: var(--card-border); border-radius: 2px; }
.tab-btn {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  color: var(--text-muted);
  padding: 8px 16px;
  border-radius: 24px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}
.tab-btn:hover, .tab-btn.active {
  background: var(--accent);
  color: #0b0f19;
  border-color: var(--accent);
}
.links-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.link-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius);
  padding: 18px 22px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  transition: all 0.2s;
}
.link-card:hover {
  border-color: #3b5078;
  transform: translateY(-1px);
}
.link-card.checked {
  opacity: 0.5;
}
.link-card.checked .post-title,
.link-card.checked .link-url {
  text-decoration: line-through;
  color: var(--text-muted);
}
.custom-check {
  width: 18px;
  height: 18px;
  margin-top: 4px;
  accent-color: var(--success);
  cursor: pointer;
}
.link-body {
  flex: 1;
  min-width: 0;
}
.meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}
.cat-badge {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 2px 8px;
  background: var(--tag-bg);
  border-radius: 6px;
  color: var(--accent);
}
.tag-badge {
  font-size: 11px;
  padding: 2px 6px;
  background: #1e293b;
  color: #cbd5e1;
  border-radius: 6px;
}
.date-badge {
  font-size: 11px;
  color: var(--text-muted);
  margin-left: auto;
}
.post-title {
  font-size: 17px;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 6px;
}
.link-url {
  color: var(--accent);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  word-break: break-all;
  display: inline-block;
  margin-bottom: 8px;
}
.link-url:hover {
  text-decoration: underline;
}
.full-content {
  font-size: 14px;
  color: #cbd5e1;
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
  background-color: rgba(10, 15, 29, 0.4);
  padding: 12px 16px;
  border-radius: 8px;
  border-left: 3px solid var(--accent);
  margin-top: 6px;
}
.expand-btn {
  background: transparent;
  border: none;
  color: var(--accent);
  font-size: 13px;
  font-weight: 600;
  padding-top: 6px;
  cursor: pointer;
}
.expand-btn:hover {
  text-decoration: underline;
}
.link-actions {
  display: flex;
  gap: 8px;
  align-self: flex-start;
  margin-top: 2px;
}
.btn {
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid var(--card-border);
  background: var(--tag-bg);
  color: var(--text);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s;
  white-space: nowrap;
}
.btn:hover { background: #2b395b; }
.btn-primary {
  background: var(--accent);
  color: #0b0f19;
  border-color: var(--accent);
}
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 14px;
  margin-top: 32px;
  padding: 18px 0;
  border-top: 1px solid var(--card-border);
}
.page-btn {
  padding: 8px 16px;
  border-radius: 8px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  color: var(--text);
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
}
.page-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.page-btn:not(:disabled):hover {
  background: var(--accent);
  color: #0b0f19;
}
</style>
</head>
<body>
<div class="app-container">
  <header>
    <div class="title-group">
      <h1>🚀 Telegram Link Vault <span class="badge-total" id="total-badge">${items.length.toLocaleString()} Links</span></h1>
    </div>
    <div class="progress-card">
      <div>Read: <strong id="read-count" style="color:var(--success)">0</strong> / <span id="filtered-total">${items.length}</span></div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" id="read-bar"></div>
      </div>
    </div>
  </header>

  <div class="controls">
    <div style="position:relative">
      <span style="position:absolute; left:16px; top:50%; transform:translateY(-50%); color:var(--text-muted)">🔍</span>
      <input type="text" id="search-input" class="search-input" placeholder="Search across all ${items.length} links, full guides, or tags...">
    </div>
    <div class="category-tabs" id="category-tabs"></div>
  </div>

  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; font-size:13px; color:var(--text-muted)">
    <span id="showing-text">Showing 1-50 of ${items.length} links</span>
    <button class="btn" onclick="copyCurrentPage()">📋 Copy This Page</button>
  </div>

  <div class="links-grid" id="links-container"></div>

  <div class="pagination">
    <button class="page-btn" id="prev-btn" onclick="changePage(-1)">← Previous</button>
    <span id="page-num" style="font-size:13px; color:var(--text-muted)">Page 1</span>
    <button class="page-btn" id="next-btn" onclick="changePage(1)">Next →</button>
  </div>
</div>

<script>
const RAW_DATA = ${JSON.stringify(items)};
let currentCat = 'all';
let currentSearch = '';
let currentPage = 1;
const PAGE_SIZE = 50;
let filteredItems = [];

const readSet = new Set(JSON.parse(localStorage.getItem('vault_read_links') || '[]'));

function updateStats() {
  document.getElementById('read-count').innerText = readSet.size;
  document.getElementById('filtered-total').innerText = RAW_DATA.length;
  const pct = ((readSet.size / RAW_DATA.length) * 100).toFixed(1);
  document.getElementById('read-bar').style.width = pct + '%';
}

function initCategories() {
  const counts = { all: RAW_DATA.length };
  RAW_DATA.forEach(i => { counts[i.c] = (counts[i.c] || 0) + 1; });

  const container = document.getElementById('category-tabs');
  container.innerHTML = '';

  const allBtn = document.createElement('button');
  allBtn.className = 'tab-btn active';
  allBtn.innerHTML = 'All Categories (' + counts.all + ')';
  allBtn.onclick = () => selectCategory('all', allBtn);
  container.appendChild(allBtn);

  Object.keys(counts).filter(k => k !== 'all').sort((a,b) => counts[b] - counts[a]).forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn';
    btn.innerHTML = cat + ' (' + counts[cat] + ')';
    btn.onclick = () => selectCategory(cat, btn);
    container.appendChild(btn);
  });
}

function selectCategory(cat, el) {
  currentCat = cat;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  currentPage = 1;
  applyFilters();
}

function applyFilters() {
  const q = currentSearch.toLowerCase();
  filteredItems = RAW_DATA.filter(item => {
    const matchCat = currentCat === 'all' || item.c === currentCat;
    if (!matchCat) return false;
    if (!q) return true;
    return item.u.toLowerCase().includes(q) || item.t.toLowerCase().includes(q) || item.s.toLowerCase().includes(q);
  });
  currentPage = 1;
  renderPage();
  updateStats();
}

function renderPage() {
  const total = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, total);
  const slice = filteredItems.slice(start, end);

  document.getElementById('showing-text').innerText = total === 0 ? 'No matching links found' : 'Showing ' + (start + 1) + '–' + end + ' of ' + total + ' links';
  document.getElementById('page-num').innerText = 'Page ' + currentPage + ' of ' + totalPages;
  document.getElementById('prev-btn').disabled = currentPage <= 1;
  document.getElementById('next-btn').disabled = currentPage >= totalPages;

  const container = document.getElementById('links-container');
  if (slice.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:64px 0; color:var(--text-muted)">No matching links.</div>';
    return;
  }

  container.innerHTML = slice.map(item => {
    const isChecked = readSet.has(item.u);
    const dateHtml = item.d ? '<span class="date-badge">' + item.d + '</span>' : '';
    const tagsHtml = (item.tags || []).map(t => '<span class="tag-badge">#' + t + '</span>').join(' ');
    const titleHtml = item.t && item.t !== item.u ? '<h2 class="post-title">' + escapeHtml(item.t) + '</h2>' : '';
    
    const isLong = item.s.length > 300;
    const shortContent = isLong ? item.s.substring(0, 300) + '...' : item.s;

    return '<article class="link-card ' + (isChecked ? 'checked' : '') + '">' +
      '<input type="checkbox" class="custom-check" ' + (isChecked ? 'checked' : '') + ' onchange="toggleRead(this, \\'' + escapeJs(item.u) + '\\')">' +
      '<div class="link-body">' +
        '<div class="meta-row">' +
          '<span class="cat-badge">' + item.c + '</span> ' + tagsHtml + dateHtml +
        '</div>' +
        titleHtml +
        '<a href="' + item.u + '" target="_blank" rel="noopener noreferrer" class="link-url">' + item.u + '</a>' +
        (item.s ? '<div class="full-content" id="content-' + item.id + '">' +
          '<span class="text-display">' + escapeHtml(shortContent) + '</span>' +
          (isLong ? '<br><button class="expand-btn" onclick="toggleExpand(' + item.id + ')">▼ Read full unabbreviated post</button>' : '') +
        '</div>' : '') +
      '</div>' +
      '<div class="link-actions">' +
        '<button class="btn" onclick="copyLink(\\'' + escapeJs(item.u) + '\\')">📋 Copy</button>' +
        '<a href="' + item.u + '" target="_blank" rel="noopener noreferrer" class="btn btn-primary">↗ Open</a>' +
      '</div>' +
    '</article>';
  }).join('');
}

function toggleExpand(id) {
  const item = RAW_DATA.find(i => i.id === id);
  if (!item) return;
  const el = document.getElementById('content-' + id);
  if (!el) return;
  
  if (el.getAttribute('data-expanded') === 'true') {
    el.setAttribute('data-expanded', 'false');
    el.innerHTML = '<span class="text-display">' + escapeHtml(item.s.substring(0, 300) + '...') + '</span>' +
      '<br><button class="expand-btn" onclick="toggleExpand(' + id + ')">▼ Read full unabbreviated post</button>';
  } else {
    el.setAttribute('data-expanded', 'true');
    el.innerHTML = '<span class="text-display">' + escapeHtml(item.s) + '</span>' +
      '<br><button class="expand-btn" onclick="toggleExpand(' + id + ')">▲ Show less</button>';
  }
}

function changePage(delta) {
  currentPage += delta;
  renderPage();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleRead(cb, url) {
  const card = cb.closest('.link-card');
  if (cb.checked) {
    readSet.add(url);
    card.classList.add('checked');
  } else {
    readSet.delete(url);
    card.classList.remove('checked');
  }
  localStorage.setItem('vault_read_links', JSON.stringify(Array.from(readSet)));
  updateStats();
}

function copyLink(url) {
  navigator.clipboard.writeText(url);
}

function copyCurrentPage() {
  const start = (currentPage - 1) * PAGE_SIZE;
  const slice = filteredItems.slice(start, start + PAGE_SIZE);
  const text = slice.map(i => i.u + (i.t ? ' — ' + i.t : '')).join('\\n');
  navigator.clipboard.writeText(text);
  alert('Copied ' + slice.length + ' links to clipboard!');
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeJs(str) {
  return str.replace(/'/g, "\\\\'");
}

document.getElementById('search-input').addEventListener('input', (e) => {
  currentSearch = e.target.value;
  applyFilters();
});

initCategories();
applyFilters();
</script>
</body>
</html>`;

  fs.writeFileSync(path.join(distDir, 'index.html'), html, 'utf-8');
  console.log(`✅ Generated GitHub Pages release: ${distDir}/index.html (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
