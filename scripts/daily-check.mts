/**
 * Daily driver — run by the GitHub Action (via tsx).
 *
 *   1. Build today's snapshot (today + 3-day forecast) from swell/wind/tide.
 *   2. Upsert it into data/history.json (the workflow commits the change).
 *   3. If today's score is PRIME, send a Telegram alert to every chat ID.
 *
 * Alerting is PRIME-only. MODERATE and POOR are recorded but never pushed.
 *
 * Idempotent per local day: the first run of the NZ day records today's
 * snapshot and (if PRIME) alerts; any later run that same day is a no-op. This
 * makes the job tolerant of GitHub's scheduling delays (a run that lands hours
 * late still does the right thing) and lets the two DST-spanning cron times
 * coexist without double-recording or double-alerting. Set FORCE_RUN=1
 * (manual dispatch) to run regardless of whether today is already recorded.
 */

import { buildSnapshot } from '@/lib/snapshot';
import { readHistoryFromDisk, upsertSnapshot, writeHistoryToDisk } from '@/lib/history';
import { sendPrimeAlert } from '@/lib/telegram';
import { LOCATION } from '@/lib/config';
import { todayLocalDateStr } from '@/lib/time';

async function main(): Promise<void> {
  const today = todayLocalDateStr(new Date());
  const existing = await readHistoryFromDisk();

  // Guard against duplicate work/alerts from the DST safety-net cron or a
  // delayed retry: skip if today's NZ date is already recorded (unless forced).
  if (!process.env.FORCE_RUN && existing.some((h) => h.date === today)) {
    console.log(`${today} already recorded — nothing to do.`);
    return;
  }

  console.log(`Assessing ${LOCATION.name} (${LOCATION.timezone})...`);
  const snapshot = await buildSnapshot();

  await writeHistoryToDisk(upsertSnapshot(existing, snapshot));
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
