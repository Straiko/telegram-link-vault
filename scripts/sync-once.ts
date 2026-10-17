import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { LinkRepository } from '../src/data/link.repository';
import { AiClassifierService } from '../src/services/ai-classifier.service';
import { TelegramService } from '../src/services/telegram.service';

const CHANNELS = (process.env.TELEGRAM_CHANNELS || 'whackdoor')
  .split(',')
  .map((c) => c.trim().replace(/^@/, ''))
  .filter(Boolean);

const jsonPath = path.resolve(process.cwd(), 'data/seed-links.json');

const urlPattern = /href=["'](https?:\/\/[^"']+)["']/gi;
const tagStripRegex = /<[^>]+>/g;
const brRegex = /<br\s*\/?>/gi;

export async function syncTelegramChannel(channelName: string): Promise<number> {
  const channelUrl = `https://t.me/s/${channelName}`;
  console.log(`[Sync] Checking ${channelUrl}...`);

  let html = '';
  try {
    const res = await fetch(channelUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
      }
    });
    if (!res.ok) {
      console.warn(`[Sync] HTTP ${res.status} for ${channelUrl}`);
      return 0;
    }
    html = await res.text();
  } catch (err) {
    console.error(`[Sync] Network error fetching ${channelUrl}:`, err);
    return 0;
  }

  // Load existing seed data to prevent duplicates
  let seedData: any[] = [];
  if (fs.existsSync(jsonPath)) {
    try {
      seedData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    } catch {
      seedData = [];
    }
  }

  const existingUrls = new Set<string>(seedData.map((s) => s.url));

  const parts = html.split('<div class="tgme_widget_message ');
  let addedCount = 0;

  for (let i = 1; i < parts.length; i++) {
    const block = parts[i];
    const postMatch = block.match(/data-post="([^"]+)"/);
    const timeMatch = block.match(/<time[^>]*datetime="([^"]+)"/);
    const textMatch = block.match(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/);

    if (!textMatch) {
      continue;
    }

    const postId = postMatch ? postMatch[1] : '';
    const postDate = timeMatch ? timeMatch[1] : new Date().toISOString();
    const rawHtml = textMatch[1];
    const textWithNewlines = rawHtml.replace(brRegex, '\n');
    const fullText = textWithNewlines.replace(tagStripRegex, '').trim();

    if (!fullText) {
      continue;
    }

    // Extract links inside the message
    const linksInMsg = new Set<string>();
    let urlMatch: RegExpExecArray | null;
    while ((urlMatch = urlPattern.exec(rawHtml)) !== null) {
      const u = urlMatch[1];
      if (
        u.startsWith('http') &&
        !u.includes(`t.me/${channelName}`) &&
        !u.includes('t.me/s/') &&
        !u.includes('telegra.ph/file')
      ) {
        linksInMsg.add(u);
      }
    }

    // If message has no external link, use the Telegram post URL itself
    if (linksInMsg.size === 0 && postId) {
      linksInMsg.add(`https://t.me/${postId}`);
    }

    for (const rawUrl of linksInMsg) {
      const cleanUrl = TelegramService.cleanUrl(rawUrl);

      if (existingUrls.has(cleanUrl)) {
        continue;
      }

      // Check SQLite if available locally
      try {
        const inDb = LinkRepository.findAll({ query: cleanUrl, limit: 1 });
        if (inDb.some((e) => e.url === cleanUrl)) {
          existingUrls.add(cleanUrl);
          continue;
        }
      } catch {
        // SQLite might not exist in CI runner
      }

      const classification = await AiClassifierService.classifyWithGroq(cleanUrl, fullText);
      const firstLine = fullText.split('\n')[0].replace(/^​/, '').trim();
      const title = firstLine.length > 5 ? firstLine.slice(0, 100) : classification.summary || cleanUrl;

      // Add to SQLite if running locally
      let newId = Date.now();
      try {
        const created = LinkRepository.create({
          url: cleanUrl,
          title,
          snippet: fullText,
          category: classification.category,
          tags: classification.tags,
          originalDate: postDate
        });
        newId = created.id;
      } catch {
        // In CI
      }

      // Prepend to seed-links.json so it appears at the top
      seedData.unshift({
        id: newId,
        url: cleanUrl,
        title,
        snippet: fullText,
        category: classification.category,
        tags: classification.tags,
        original_date: postDate,
        created_at: new Date().toISOString()
      });

      existingUrls.add(cleanUrl);
      console.log(`[Sync] ✨ Ingested post: ${title}`);
      console.log(`       🔗 ${cleanUrl} [${classification.category}]`);
      addedCount++;
    }
  }

  if (addedCount > 0) {
    fs.writeFileSync(jsonPath, JSON.stringify(seedData, null, 2), 'utf-8');
    console.log(`[Sync] Saved ${addedCount} new post(s) into ${jsonPath}`);
  }

  return addedCount;
}

async function run(): Promise<void> {
  let totalAdded = 0;
  for (const ch of CHANNELS) {
    totalAdded += await syncTelegramChannel(ch);
  }

  console.log(`[Sync] Finished pass. Total new posts added: ${totalAdded}`);

  if (totalAdded > 0 && process.env.AUTO_PUSH === 'true') {
    try {
      console.log('[Sync] Pulling rebase and auto-pushing to GitHub...');
      execSync('git add data/seed-links.json && git commit -m "chore(sync): auto-sync new posts from Telegram" && git pull --rebase origin main && git push origin main', {
        stdio: 'inherit'
      });
      console.log('[Sync] Successfully pushed to GitHub!');
    } catch (e) {
      console.error('[Sync] Git push failed:', e);
    }
  }
}

if (require.main === module) {
  run();
}
