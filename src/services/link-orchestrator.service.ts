import { TelegramService } from './telegram.service';
import { AiClassifierService } from './ai-classifier.service';
import { LinkRepository } from '@/data/link.repository';
import { LinkItem, Result } from '@/domain/link.types';
import { TelegramUpdateDto } from '@/domain/link.schema';

export class LinkOrchestratorService {
  /**
   * Orchestrates incoming webhook update from Telegram bot:
   * 1. Extracts & normalizes all URLs from message/post
   * 2. Categorizes with Groq AI (or heuristic fallback)
   * 3. Persists to SQLite repository
   * 4. Confirms back to user if a private chat
   */
  public static async processTelegramUpdate(update: TelegramUpdateDto): Promise<Result<LinkItem[]>> {
    const extractedLinks = TelegramService.extractLinksFromUpdate(update);

    if (extractedLinks.length === 0) {
      return { success: true, data: [] };
    }

    const savedItems: LinkItem[] = [];

    for (const link of extractedLinks) {
      const classification = await AiClassifierService.classifyWithGroq(link.url, link.contextText);

      const created = LinkRepository.create({
        url: link.url,
        title: classification.summary || link.url,
        snippet: link.contextText,
        category: classification.category,
        tags: classification.tags,
        originalDate: link.originalDate
      });

      savedItems.push(created);

      // Notify Telegram user only in private chats (chatId > 0) to avoid spamming broadcast channels or failing on 403 Forbidden
      if (link.chatId && link.chatId > 0) {
        const msg = `✅ <b>Saved to Vault</b>\n📂 <b>Category:</b> #${classification.category}\n🏷️ <b>Tags:</b> ${classification.tags.map(t => `#${t}`).join(' ')}\n🔗 <a href="${link.url}">${link.url}</a>`;
        await TelegramService.sendTelegramMessage(link.chatId, msg);
      }
    }

    return { success: true, data: savedItems };
  }

  /**
   * Directly ingest a single URL with AI classification.
   */
  public static async ingestSingleLink(url: string, contextSnippet: string): Promise<Result<LinkItem>> {
    const cleaned = TelegramService.cleanUrl(url);
    const classification = await AiClassifierService.classifyWithGroq(cleaned, contextSnippet);

    const created = LinkRepository.create({
      url: cleaned,
      title: classification.summary || cleaned,
      snippet: contextSnippet,
      category: classification.category,
      tags: classification.tags,
      originalDate: new Date().toISOString()
    });

    return { success: true, data: created };
  }
}
