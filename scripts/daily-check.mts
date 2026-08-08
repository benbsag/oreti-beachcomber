/**
 * Daily driver — run by the GitHub Action (via tsx).
 *
 *   1. Build today's snapshot (today + 3-day forecast) from swell/wind/tide.
 *   2. Upsert it into data/history.json (the workflow commits the change).
 *   3. If today's score is PRIME, send a Telegram alert to every chat ID.
 *
 * Alerting is PRIME-only. MODERATE and POOR are recorded but never pushed.
 *
 * Optional exactness: with EXACT_LOCAL_HOUR set (see the second cron in the
 * workflow), the script early-exits unless the local hour matches, so the two
 * DST-spanning cron times don't double-run.
 */

import { buildSnapshot } from '@/lib/snapshot';
import { readHistoryFromDisk, upsertSnapshot, writeHistoryToDisk } from '@/lib/history';
import { sendPrimeAlert } from '@/lib/telegram';
import { LOCATION } from '@/lib/config';
import { localParts } from '@/lib/time';

async function main(): Promise<void> {
  // Optional guard so a second cron (DST safety net) doesn't produce a duplicate run.
  const exact = process.env.EXACT_LOCAL_HOUR;
  if (exact) {
    const hour = localParts(new Date()).hour;
    if (hour !== Number(exact)) {
      console.log(`Local hour ${hour} != EXACT_LOCAL_HOUR ${exact}; skipping this run.`);
      return;
    }
  }

  console.log(`Assessing ${LOCATION.name} (${LOCATION.timezone})...`);
  const snapshot = await buildSnapshot();

  const history = await readHistoryFromDisk();
  await writeHistoryToDisk(upsertSnapshot(history, snapshot));
  console.log(`Recorded ${snapshot.date}: ${snapshot.score} — ${snapshot.why}`);

  if (snapshot.score === 'PRIME') {
    const result = await sendPrimeAlert(snapshot);
    if (result.skipped) {
      console.log('PRIME, but TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_IDS not set — no alert sent.');
    } else {
      console.log(`Telegram alert: ${result.sent} sent, ${result.failed} failed.`);
    }
  } else {
    console.log('Not PRIME — no alert sent (by design).');
  }
}

main().catch((err) => {
  console.error('daily-check failed:', err);
  process.exit(1);
});
