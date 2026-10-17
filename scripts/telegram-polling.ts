import { TelegramUpdateSchema } from '../src/domain/link.schema';
import { LinkOrchestratorService } from '../src/services/link-orchestrator.service';

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('\n❌ ERROR: TELEGRAM_BOT_TOKEN is not set in environment or .env.local!');
  console.error('To run live Telegram polling:');
  console.error('1. Get a bot token from @BotFather in Telegram');
  console.error('2. Add it to .env.local or run:');
  console.error('   TELEGRAM_BOT_TOKEN="your_token" npm run bot\n');
  process.exit(1);
}

console.log('🤖 Telegram Bot Long Poller starting...');
console.log('Listening for new Telegram posts and links in real-time...');

let offset = 0;

async function pollUpdates(): Promise<void> {
  const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&timeout=25`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Telegram API error: ${res.statusText}`);
      await new Promise((r) => setTimeout(r, 5000));
      return;
    }

    const data = await res.json();
    if (!data.ok || !Array.isArray(data.result)) {
      return;
    }

    for (const update of data.result) {
      offset = update.update_id + 1;

      const validated = TelegramUpdateSchema.safeParse(update);
      if (!validated.success) {
        continue;
      }

      console.log(`\n📩 Received Telegram update #${update.update_id}`);
      const result = await LinkOrchestratorService.processTelegramUpdate(validated.data);

      if (result.success && result.data.length > 0) {
        console.log(`✨ Successfully ingested ${result.data.length} new link(s) with AI categorization!`);
        for (const item of result.data) {
          console.log(`  + [${item.category}] ${item.url}`);
        }
      } else if (result.success) {
        console.log('ℹ️ Message received, but no links were found.');
      } else {
        console.error(`❌ Ingestion error: ${result.error}`);
      }
    }
  } catch (error) {
    console.error('Polling connection error:', error);
    await new Promise((r) => setTimeout(r, 3000));
  }
}

async function loop(): Promise<void> {
  while (true) {
    await pollUpdates();
  }
}

loop();
