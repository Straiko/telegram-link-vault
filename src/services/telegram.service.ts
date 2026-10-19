import { TelegramUpdateDto } from '@/domain/link.schema';

const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  'igshid',
  'si',
  'ref'
]);

export interface ExtractedTelegramLink {
  url: string;
  contextText: string;
  originalDate: string;
  chatId?: number;
}

export class TelegramService {
  public static cleanUrl(rawUrl: string): string {
    const trimmed = rawUrl.trim().replace(/[.,;!?:)]+$/, '');
    try {
      const parsed = new URL(trimmed);
      const keysToDelete: string[] = [];
      parsed.searchParams.forEach((_, key) => {
        if (TRACKING_PARAMS.has(key.toLowerCase())) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach((k) => parsed.searchParams.delete(k));
      return parsed.toString();
    } catch {
      return trimmed;
    }
  }

  public static extractLinksFromUpdate(update: TelegramUpdateDto): ExtractedTelegramLink[] {
    const msg = update.message || update.channel_post || update.edited_channel_post || update.edited_message;
    if (!msg) {
      return [];
    }

    const text = msg.text || msg.caption || '';
    const entities = msg.entities || msg.caption_entities || [];
    const dateStr = new Date(msg.date * 1000).toISOString();
    const chatId = msg.chat.id;

    const collectedUrls = new Set<string>();

    // 1. Process explicit entities
    for (const entity of entities) {
      if (entity.type === 'url') {
        const extracted = text.substring(entity.offset, entity.offset + entity.length);
        collectedUrls.add(extracted);
      } else if (entity.type === 'text_link' && entity.url) {
        collectedUrls.add(entity.url);
      }
    }

    // 2. Fallback regex to capture any raw links
    const urlRegex = /(https?:\/\/[^\s<>"]+)/gi;
    let match: RegExpExecArray | null;
    while ((match = urlRegex.exec(text)) !== null) {
      collectedUrls.add(match[1]);
    }

    const results: ExtractedTelegramLink[] = [];
    for (const rawUrl of collectedUrls) {
      const cleaned = this.cleanUrl(rawUrl);
      if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
        results.push({
          url: cleaned,
          contextText: text.replace(rawUrl, '').trim(),
          originalDate: dateStr,
          chatId
        });
      }
    }

    return results;
  }

  public static async sendTelegramMessage(chatId: number, text: string): Promise<boolean> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      return false;
    }

    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML'
        })
      });
      return res.ok;
    } catch (error) {
      console.error({ error }, 'Failed to send Telegram confirmation');
      return false;
    }
  }
}
