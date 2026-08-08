/**
 * Telegram alerting. Sends a concise PRIME-only message to every chat ID in
 * TELEGRAM_CHAT_IDS. This only ever runs server-side (Action or API route) — the
 * bot token must never reach the client.
 */

import { LOCATION, SITE_URL } from '@/lib/config';
import { degToCompass } from '@/lib/compass';
import { friendlyDate } from '@/lib/time';
import type { Snapshot } from '@/lib/types';

export interface TelegramResult {
  sent: number;
  failed: number;
  /** True when no token / chat IDs are configured, so nothing was attempted. */
  skipped: boolean;
}

/** Human-readable alert body. Concise: score, why, best walk window. */
export function formatMessage(snap: Snapshot): string {
  const s = snap.swell;
  const w = snap.wind;
  const swellLine =
    s.peakHeight != null
      ? `Swell ${s.peakHeight.toFixed(1)} m${s.direction != null ? ` from ${degToCompass(s.direction)}` : ''}`
      : 'Swell data unavailable';
  const windLine = w.speed != null ? `${w.favourable ? 'onshore' : 'cross/offshore'} wind ${Math.round(w.speed)} km/h` : 'wind n/a';
  const tideLine = snap.tide.daytimeLowTideLocal ? `Low tide ${snap.tide.daytimeLowTideLocal}` : 'No daytime low';
  const walk = snap.bestWalkWindow ? `\n🚶 Best walk: <b>${snap.bestWalkWindow}</b>` : '';

  return (
    `🌊 <b>PRIME beachcombing</b> — ${LOCATION.name}\n` +
    `📅 ${friendlyDate(snap.date)}\n\n` +
    `${swellLine}, ${windLine}.\n` +
    `${tideLine}.${walk}\n\n` +
    `📊 3-day forecast at ${SITE_URL}\n\n` +
    `Conditions are checked once a day.`
  );
}

/** Send the PRIME alert to all configured chat IDs. Never throws. */
export async function sendPrimeAlert(snap: Snapshot): Promise<TelegramResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const ids = (process.env.TELEGRAM_CHAT_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  if (!token || ids.length === 0) return { sent: 0, failed: 0, skipped: true };

  const text = formatMessage(snap);
  let sent = 0;
  let failed = 0;

  for (const chatId of ids) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) sent++;
      else failed++;
    } catch {
      failed++;
    }
  }

  return { sent, failed, skipped: false };
}
