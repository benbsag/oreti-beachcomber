/**
 * Tide prediction — offline-first harmonic method with a coarse fallback.
 *
 * PRIMARY: harmonic prediction via @neaps/tide-predictor, seeded with the
 * committed Bluff constituents (data/constituents.bluff.json — TICON-4 / UHSLC,
 * the LINZ standard port ~18 km from Oreti Beach). Oreti Beach is applied as a
 * secondary station via ORETI_OFFSET (see lib/config.ts). We only need low-tide
 * TIMING, so datum (MSL vs LAT) is irrelevant.
 *
 * FALLBACK: if constituents are missing or the harmonic call throws, derive low
 * tides from Open-Meteo `sea_level_height_msl` by finding local minima.
 */

import { createTidePredictor } from '@neaps/tide-predictor';
import bluff from '@/data/constituents.bluff.json';
import { DAYTIME_WINDOW, ORETI_OFFSET } from '@/lib/config';
import { localDateStr, localHHMM, localMidnightUtc, localParts } from '@/lib/time';
import { fetchSeaLevel } from '@/lib/sources/sea-level';
import type { TideSummary } from '@/lib/types';

export interface TideResult {
  summary: TideSummary;
  status: 'ok' | 'fallback' | 'failed';
  /** First daytime low tide as a UTC instant (for the best-walk window), or null. */
  daytimeLow: Date | null;
}

const WINDOW_LABEL = `${pad(DAYTIME_WINDOW.startHour)}:00-${pad(DAYTIME_WINDOW.endHour)}:00`;

interface Low {
  time: Date;
  local: string; // HH:MM
  hour: number; // fractional local hour
}

/** Harmonic low tides whose LOCAL date equals dateStr. */
function harmonicLows(dateStr: string): Low[] {
  const mid = localMidnightUtc(dateStr).getTime();
  // Widen the search a few hours either side so extremes near midnight resolve,
  // then filter strictly by local date.
  const start = new Date(mid - 3 * 3600 * 1000);
  const end = new Date(mid + 27 * 3600 * 1000);
  const predictor = createTidePredictor(bluff.constituents);
  const extremes = predictor.getExtremesPrediction({ start, end, offsets: ORETI_OFFSET });

  const lows: Low[] = [];
  for (const e of extremes) {
    if (!e.low) continue;
    if (localDateStr(e.time) !== dateStr) continue;
    const p = localParts(e.time);
    lows.push({ time: e.time, local: localHHMM(e.time), hour: p.hour + p.minute / 60 });
  }
  return lows.sort((a, b) => a.time.getTime() - b.time.getTime());
}

function daytime(lows: Low[]): Low[] {
  return lows.filter((l) => l.hour >= DAYTIME_WINDOW.startHour && l.hour < DAYTIME_WINDOW.endHour);
}

/** Assess tides for a single local day ("YYYY-MM-DD"). Never throws. */
export async function assessTide(dateStr: string): Promise<TideResult> {
  try {
    if (!bluff?.constituents?.length) throw new Error('no constituents');
    const lows = harmonicLows(dateStr);
    if (lows.length === 0) throw new Error('no harmonic lows resolved');
    const day = daytime(lows);
    return {
      status: 'ok',
      daytimeLow: day[0]?.time ?? null,
      summary: {
        lowTides: lows.map((l) => l.local),
        daytimeLowTide: day.length > 0,
        daytimeLowTideLocal: day[0]?.local ?? null,
        window: WINDOW_LABEL,
        method: 'harmonic',
      },
    };
  } catch {
    return fallbackTide(dateStr);
  }
}

/** Coarse fallback: local minima of the hourly sea-level series. */
async function fallbackTide(dateStr: string): Promise<TideResult> {
  const series = await fetchSeaLevel();
  const failed: TideResult = {
    status: 'failed',
    daytimeLow: null,
    summary: {
      lowTides: [],
      daytimeLowTide: false,
      daytimeLowTideLocal: null,
      window: WINDOW_LABEL,
      method: 'none',
    },
  };
  if (!series.ok) return failed;

  const dayPts = series.points
    .filter((p) => localDateStr(p.time) === dateStr)
    .sort((a, b) => a.time.getTime() - b.time.getTime());
  if (dayPts.length < 3) return failed;

  const lows: Low[] = [];
  for (let i = 1; i < dayPts.length - 1; i++) {
    const prev = dayPts[i - 1].level;
    const cur = dayPts[i].level;
    const next = dayPts[i + 1].level;
    if (cur <= prev && cur < next) {
      const p = localParts(dayPts[i].time);
      lows.push({ time: dayPts[i].time, local: localHHMM(dayPts[i].time), hour: p.hour + p.minute / 60 });
    }
  }

  const day = daytime(lows);
  return {
    status: 'fallback',
    daytimeLow: day[0]?.time ?? null,
    summary: {
      lowTides: lows.map((l) => l.local),
      daytimeLowTide: day.length > 0,
      daytimeLowTideLocal: day[0]?.local ?? null,
      window: WINDOW_LABEL,
      method: 'sea_level_fallback',
    },
  };
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
