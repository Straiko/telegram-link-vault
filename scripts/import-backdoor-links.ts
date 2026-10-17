import fs from 'fs';
import path from 'path';
import { LinkRepository } from '../src/data/link.repository';
import { AiClassifierService } from '../src/services/ai-classifier.service';
import { LinkCreateInput } from '../src/domain/link.types';

const mdPath = path.resolve(process.env.HOME || '/home/root2506', 'telegram_saved_links.md');

if (!fs.existsSync(mdPath)) {
  console.error(`Export markdown not found at ${mdPath}`);
  process.exit(1);
}

console.log(`Reading links from ${mdPath}...`);
const fileContent = fs.readFileSync(mdPath, 'utf-8');
const lines = fileContent.split('\n');

const itemsToInsert: LinkCreateInput[] = [];
const seenUrls = new Set<string>();

const lineRegex = /^- \[ \] \[(.+?)\]\(\1\)(?: — \*(.+?)\*)?(?: `\[(.*?)\]`)?$/;

for (const line of lines) {
  const trimmed = line.trim();
  const match = lineRegex.exec(trimmed);

  if (match) {
    const url = match[1];
    if (seenUrls.has(url)) {
      continue;
    }
    seenUrls.add(url);

    const snippet = match[2] || '';
    const originalDate = match[3] || new Date().toISOString();

    const classification = AiClassifierService.classifyHeuristic(url, snippet);

    itemsToInsert.push({
      url,
      title: classification.summary || url,
      snippet,
      category: classification.category,
      tags: classification.tags,
      originalDate
    });
  }
}

console.log(`Parsed ${itemsToInsert.length} links. Seeding into SQLite database in batches...`);

const BATCH_SIZE = 500;
let totalInserted = 0;

for (let i = 0; i < itemsToInsert.length; i += BATCH_SIZE) {
  const batch = itemsToInsert.slice(i, i + BATCH_SIZE);
  const count = LinkRepository.batchCreate(batch);
  totalInserted += count;
  console.log(`  Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}: ${totalInserted}/${itemsToInsert.length}`);
}

console.log(`🎉 Finished seeding! Total inserted: ${totalInserted}`);
const stats = LinkRepository.getStats();
console.log('Database Stats:', stats);
