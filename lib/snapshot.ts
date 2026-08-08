/**
 * Snapshot orchestration — the shared entry point used by BOTH the daily
 * GitHub Action script and the optional API route. Fetches all sources once and
 * assembles today's record plus the 3-day forecast. Frozen once per day.
 */

import { fetchSwell } from '@/lib/sources/swell';
import { fetchWind } from '@/lib/sources/wind';
import { assessTide } from '@/lib/tide';
import { scoreDay } from '@/lib/assess';
import { addDaysLocal, todayLocalDateStr } from '@/lib/time';
import type { DayRecord, Snapshot } from '@/lib/types';

/** Build the full frozen snapshot (today + next 3 days). Never throws. */
export async function buildSnapshot(now: Date = new Date()): Promise<Snapshot> {
  const today = todayLocalDateStr(now);
  const days = [today, addDaysLocal(today, 1), addDaysLocal(today, 2), addDaysLocal(today, 3)];

  // Fetch swell + wind once; the same series feed every day's window.
  const [swellSeries, windSeries] = await Promise.all([fetchSwell(), fetchWind()]);

  const records: DayRecord[] = [];
  for (const date of days) {
    const tide = await assessTide(date);
    records.push(scoreDay(date, swellSeries, windSeries, tide));
  }

  const [todayRecord, ...forecast] = records;
  return { ...todayRecord, forecast, generatedAt: new Date().toISOString() };
}
