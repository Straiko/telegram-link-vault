import { execSync } from 'child_process';
import { syncTelegramChannel, cleanChannelName } from './sync-once';

const CHANNELS = (process.env.TELEGRAM_CHANNELS || 'whackdoor')
  .split(',')
  .map(cleanChannelName)
  .filter(Boolean);

const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '30000', 10); // 30 seconds

console.log(`📡 Telegram Auto-Sync Daemon starting...`);
console.log(`Channels monitored: ${CHANNELS.map((c) => `@${c}`).join(', ')}`);
console.log(`Interval: ${POLL_INTERVAL_MS / 1000}s`);

async function syncAndDeploy(): Promise<void> {
  let totalAdded = 0;
  for (const ch of CHANNELS) {
    try {
      const added = await syncTelegramChannel(ch);
      totalAdded += added;
    } catch (err) {
      console.error(`[AutoSync] Error syncing @${ch}:`, err);
    }
  }

  if (totalAdded > 0) {
    console.log(`[AutoSync] 🚀 Found ${totalAdded} new post(s)! Auto-pushing to GitHub to update live website...`);
    try {
      execSync('git add data/seed-links.json && git commit -m "chore(sync): auto-sync new posts from Telegram channel" && git pull --rebase origin main && git push origin main', {
        stdio: 'inherit'
      });
      console.log(`[AutoSync] ✅ Changes pushed to GitHub! GitHub Pages deployment triggered automatically.`);
    } catch (err) {
      console.error(`[AutoSync] ⚠️ Git push failed:`, err);
    }
  }
}

async function loop(): Promise<void> {
  try {
    await syncAndDeploy();
  } catch (err) {
    console.error(`[AutoSync] Unexpected error during loop iteration:`, err);
  } finally {
    setTimeout(loop, POLL_INTERVAL_MS);
  }
}

// Start continuous polling loop
loop();
