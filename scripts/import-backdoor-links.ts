import fs from 'fs';
import path from 'path';
import { db } from '../src/data/db';
import { LinkRepository } from '../src/data/link.repository';
import { AiClassifierService } from '../src/services/ai-classifier.service';
import { LinkCreateInput } from '../src/domain/link.types';

const exportDir = path.resolve(
  process.env.HOME || '/home/root2506',
  'Загрузки/Telegram Desktop/ChatExport_2026-10-18'
);

if (!fs.existsSync(exportDir)) {
  console.error(`Export directory not found at ${exportDir}`);
  process.exit(1);
}

console.log(`Scanning HTML files in ${exportDir}...`);

// Clear existing truncated records to ensure fresh full posts
db.exec('DELETE FROM links;');
console.log('Cleared existing links from database.');

const files = fs
  .readdirSync(exportDir)
  .filter((f) => f.startsWith('messages') && f.endsWith('.html'))
  .sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, '') || '1', 10);
    const numB = parseInt(b.replace(/\D/g, '') || '1', 10);
    return numA - numB;
  });

console.log(`Found ${files.length} HTML files.`);

const msgPattern = /<div class=["']message [^>]*>.*?(?:<div class=["']pull_right date details["'] title=["']([^"']+)["']>)?.*?<div class=["']text["']>(.*?)<\/div>.*?<\/div>\s*<\/div>/gs;
const hrefRegex = /href=["'](https?:\/\/[^"']+)["']/gi;
const rawUrlRegex = /(https?:\/\/[^\s<>"]+)/gi;
const brRegex = /<br\s*\/?>/gi;
const tagStripRegex = /<[^>]+>/g;

const itemsToInsert: LinkCreateInput[] = [];
const seenUrls = new Set<string>();

for (const file of files) {
  const filePath = path.join(exportDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');

  let match: RegExpExecArray | null;
  while ((match = msgPattern.exec(content)) !== null) {
    const dateStr = match[1] || '';
    const rawHtml = match[2] || '';

    // Convert <br> to newlines and strip HTML tags
    const textWithNewlines = rawHtml.replace(brRegex, '\n');
    const fullText = textWithNewlines.replace(tagStripRegex, '').trim();

    // Extract all URLs
    const urlsInMsg = new Set<string>();
    let hrefMatch: RegExpExecArray | null;
    while ((hrefMatch = hrefRegex.exec(rawHtml)) !== null) {
      urlsInMsg.add(hrefMatch[1]);
    }
    let rawMatch: RegExpExecArray | null;
    while ((rawMatch = rawUrlRegex.exec(fullText)) !== null) {
      urlsInMsg.add(rawMatch[1]);
    }

    for (const rawUrl of urlsInMsg) {
      let cleanUrl = rawUrl.replace(/[.,;!?:)]+$/, '');
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        continue;
      }
      // Skip telegraph internal preview image URLs
      if (cleanUrl.includes('telegra.ph/file/')) {
        continue;
      }
      if (seenUrls.has(cleanUrl)) {
        continue;
      }
      seenUrls.add(cleanUrl);

      // Clean tracking params
      try {
        const parsed = new URL(cleanUrl);
        const keysToRemove = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid', 'si'];
        keysToRemove.forEach((k) => parsed.searchParams.delete(k));
        cleanUrl = parsed.toString();
      } catch {
        // keep cleanUrl as is
      }

      const classification = AiClassifierService.classifyHeuristic(cleanUrl, fullText);

      // Extract a clean title from the first line of the post
      const firstLine = fullText.split('\n')[0].replace(/^​/, '').trim();
      const title = firstLine.length > 5 ? firstLine.slice(0, 100) : classification.summary || cleanUrl;

      itemsToInsert.push({
        url: cleanUrl,
        title,
        snippet: fullText, // Full unabbreviated post content!
        category: classification.category,
        tags: classification.tags,
        originalDate: dateStr
      });
    }
  }
}

console.log(`Parsed ${itemsToInsert.length} links with FULL UNABBREVIATED texts.`);
console.log('Seeding into SQLite database in batches...');

const BATCH_SIZE = 500;
let totalInserted = 0;

for (let i = 0; i < itemsToInsert.length; i += BATCH_SIZE) {
  const batch = itemsToInsert.slice(i, i + BATCH_SIZE);
  const count = LinkRepository.batchCreate(batch);
  totalInserted += count;
  console.log(`  Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}: ${totalInserted}/${itemsToInsert.length}`);
}

console.log(`🎉 Finished seeding with FULL posts! Total: ${totalInserted}`);
const stats = LinkRepository.getStats();
console.log('Database Stats:', stats);
