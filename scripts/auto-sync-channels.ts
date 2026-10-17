import { LinkRepository } from '../src/data/link.repository';
import { AiClassifierService } from '../src/services/ai-classifier.service';
import { TelegramService } from '../src/services/telegram.service';

const CHANNELS = (process.env.TELEGRAM_CHANNELS || 'whackdoor')
  .split(',')
  .map((c) => c.trim().replace(/^@/, ''))
  .filter(Boolean);

const POLL_INTERVAL_MS = 30 * 1000; // Poll every 30 seconds

console.log(`📡 Telegram Auto-Sync Daemon starting...`);
console.log(`Channels monitored: ${CHANNELS.map((c) => `@${c}`).join(', ')}`);
console.log(`Interval: ${POLL_INTERVAL_MS / 1000}s`);

const urlPattern = /href=["'](https?:\/\/[^"']+)["']/gi;
const tagStripRegex = /<[^>]+>/g;
const brRegex = /<br\s*\/?>/gi;

async function syncChannel(channelName: string): Promise<number> {
  const channelUrl = `https://t.me/s/${channelName}`;
  let html = '';

  try {
    const res = await fetch(channelUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!res.ok) {
      console.warn(`[AutoSync] Could not fetch ${channelUrl}: ${res.status} ${res.statusText}`);
      return 0;
    }

    html = await res.text();
  } catch (err) {
    console.error(`[AutoSync] Network error fetching ${channelUrl}:`, err);
    return 0;
  }

  // Find all message text blocks
  // <div class="tgme_widget_message_text js-message_text" dir="auto">...</div>
  const msgBlockRegex = /<div class="tgme_widget_message_text[^"]*"[^>]*>(.*?)<\/div>/gis;
  let match: RegExpExecArray | null;
  let newLinksCount = 0;

  while ((match = msgBlockRegex.exec(html)) !== null) {
    const rawHtml = match[1];

    // Clean text
    const textWithNewlines = rawHtml.replace(brRegex, '\n');
    const fullText = textWithNewlines.replace(tagStripRegex, '').trim();

    // Extract links
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

    for (const rawUrl of linksInMsg) {
      const cleanUrl = TelegramService.cleanUrl(rawUrl);

      // Check if already in DB
      const existing = LinkRepository.findAll({ query: cleanUrl, limit: 1 });
      if (existing.some((e) => e.url === cleanUrl)) {
        continue;
      }

      // Classify with AI
      const classification = await AiClassifierService.classifyWithGroq(cleanUrl, fullText);

      // Extract title from first line of post
      const firstLine = fullText.split('\n')[0].replace(/^​/, '').trim();
      const title = firstLine.length > 5 ? firstLine.slice(0, 100) : classification.summary || cleanUrl;

      LinkRepository.create({
        url: cleanUrl,
        title,
        snippet: fullText, // Full unabbreviated post content
        category: classification.category,
        tags: classification.tags,
        originalDate: new Date().toISOString()
      });

      console.log(`[AutoSync] 🚀 Ingested new post from @${channelName}:`);
      console.log(`  🔗 ${cleanUrl}`);
      console.log(`  🏷️ [${classification.category}] ${title}`);
      newLinksCount++;
    }
  }

  return newLinksCount;
}

async function loop(): Promise<void> {
  for (const ch of CHANNELS) {
    try {
      const added = await syncChannel(ch);
      if (added > 0) {
        console.log(`[AutoSync] Added ${added} new links from @${ch}.`);
      }
    } catch (err) {
      console.error(`[AutoSync] Error syncing @${ch}:`, err);
    }
  }

  setTimeout(loop, POLL_INTERVAL_MS);
}

// Start polling
loop();
