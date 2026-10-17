import { Category } from '@/domain/link.types';

export interface ClassificationResult {
  category: Category;
  tags: string[];
  summary: string;
}

const VALID_CATEGORIES: Category[] = [
  'ai-models',
  'dev-tools',
  'articles',
  'gaming',
  'media',
  'apps',
  'telegram',
  'social',
  'utilities'
];

export class AiClassifierService {
  /**
   * Fast rule-based heuristic classification used as fallback or offline mode.
   */
  public static classifyHeuristic(url: string, snippet: string): ClassificationResult {
    let hostname = '';
    try {
      hostname = new URL(url).hostname.toLowerCase();
      if (hostname.startsWith('www.')) {
        hostname = hostname.slice(4);
      }
    } catch {
      hostname = '';
    }

    const text = `${url} ${snippet}`.toLowerCase();

    if (
      hostname.includes('huggingface.co') ||
      hostname.includes('openai.com') ||
      hostname.includes('anthropic.com') ||
      hostname.includes('claude.ai') ||
      hostname.includes('replicate.com') ||
      text.includes('нейросет') ||
      text.includes('ии ') ||
      text.includes('llm') ||
      text.includes('chatgpt')
    ) {
      return { category: 'ai-models', tags: ['ai', 'neural-network', 'machine-learning'], summary: snippet || 'AI Model or Tool' };
    }

    if (
      hostname.includes('github.com') ||
      hostname.includes('gitlab.com') ||
      hostname.includes('pypi.org') ||
      hostname.includes('npmjs.com') ||
      hostname.includes('stackoverflow.com')
    ) {
      return { category: 'dev-tools', tags: ['code', 'open-source', 'development'], summary: snippet || 'Development repository or package' };
    }

    if (
      hostname.includes('steampowered.com') ||
      hostname.includes('steamcommunity.com') ||
      hostname.includes('epicgames.com') ||
      hostname.includes('itch.io') ||
      hostname.includes('roblox.com')
    ) {
      return { category: 'gaming', tags: ['gaming', 'steam', 'games'], summary: snippet || 'Game or gaming platform' };
    }

    if (
      hostname.includes('youtube.com') ||
      hostname.includes('youtu.be') ||
      hostname.includes('twitch.tv') ||
      hostname.includes('tiktok.com') ||
      hostname.includes('kick.com')
    ) {
      return { category: 'media', tags: ['video', 'stream', 'entertainment'], summary: snippet || 'Video or live stream' };
    }

    if (
      hostname.includes('apps.apple.com') ||
      hostname.includes('play.google.com') ||
      hostname.includes('chrome.google.com')
    ) {
      return { category: 'apps', tags: ['application', 'mobile', 'extension'], summary: snippet || 'App or extension' };
    }

    if (
      hostname.includes('telegra.ph') ||
      hostname.includes('habr.com') ||
      hostname.includes('medium.com') ||
      hostname.includes('vc.ru') ||
      hostname.includes('tass.ru') ||
      hostname.includes('kommersant.ru')
    ) {
      return { category: 'articles', tags: ['article', 'reading', 'news'], summary: snippet || 'Article or editorial post' };
    }

    if (hostname.includes('t.me') || hostname.includes('telegram.org')) {
      return { category: 'telegram', tags: ['telegram', 'channel', 'community'], summary: snippet || 'Telegram channel or post' };
    }

    if (
      hostname.includes('twitter.com') ||
      hostname.includes('x.com') ||
      hostname.includes('reddit.com') ||
      hostname.includes('vk.com')
    ) {
      return { category: 'social', tags: ['social', 'community', 'discussion'], summary: snippet || 'Social media post' };
    }

    return { category: 'utilities', tags: ['web', 'utility'], summary: snippet || 'Web link or service' };
  }

  /**
   * Neural network classification using Groq's high-speed Llama 3 models.
   * Gracefully falls back to heuristic engine if API key is absent or request fails.
   */
  public static async classifyWithGroq(url: string, snippet: string): Promise<ClassificationResult> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return this.classifyHeuristic(url, snippet);
    }

    const systemPrompt = `You are a high-speed web link classifier. Given a URL and context snippet, classify it into exactly one category from this list:
[ai-models, dev-tools, articles, gaming, media, apps, telegram, social, utilities].
Also output 2-4 lowercase tags, and a 1-sentence clean summary in English or Russian matching the snippet.
Return ONLY valid JSON matching this schema:
{
  "category": "one_of_the_categories",
  "tags": ["tag1", "tag2"],
  "summary": "1 sentence description"
}`;

    const userPrompt = `URL: ${url}\nContext Snippet: ${snippet || 'No description provided'}`;

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1
        })
      });

      if (!response.ok) {
        console.error({ status: response.status }, 'Groq API request failed, falling back to heuristic');
        return this.classifyHeuristic(url, snippet);
      }

      const json = await response.json();
      const content = json.choices?.[0]?.message?.content;
      if (!content) {
        return this.classifyHeuristic(url, snippet);
      }

      const parsed = JSON.parse(content);
      const category: Category = VALID_CATEGORIES.includes(parsed.category)
        ? parsed.category
        : this.classifyHeuristic(url, snippet).category;

      const tags: string[] = Array.isArray(parsed.tags) ? parsed.tags : [];
      const summary: string = typeof parsed.summary === 'string' ? parsed.summary : snippet;

      return { category, tags, summary };
    } catch (error) {
      console.error({ error }, 'Groq classification encountered an error, used heuristic fallback');
      return this.classifyHeuristic(url, snippet);
    }
  }
}
