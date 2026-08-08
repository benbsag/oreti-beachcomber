/**
 * Scoring core. Pure functions that turn swell + wind + tide into a
 * Beachcombing Potential score for a single local day.
 *
 * Rules (see the build spec):
 *   PRIME    — onshore wind AND peak swell > 2.5 m from S/SW AND a daytime low tide
 *   MODERATE — swell 1.5-2.5 m AND a daytime low tide
 *   POOR     — swell < 1.5 m, OR no daytime low tide
 *
 * Resolution of the unstated edge case (swell > 2.5 m but wind offshore or swell
 * from the wrong sector, with a daytime low): treated as MODERATE. In general,
 * MODERATE = a daytime low tide AND peak swell >= 1.5 m without meeting every
 * PRIME criterion. This keeps the classifier total and deterministic.
 */

import {
  FAVOURABLE_SWELL_FROM,
  ONSHORE_WIND_FROM,
  SWELL_MODERATE_MIN,
  SWELL_PRIME_MIN,
  SWELL_WINDOW,
  WALK_WINDOW_HALF_MIN,
  DAYTIME_WINDOW,
} from '@/lib/config';
import { degToCompass } from '@/lib/compass';
import { local12h, localDateStr, localMidnightUtc } from '@/lib/time';
import type { SwellSeries } from '@/lib/sources/swell';
import type { WindSeries } from '@/lib/sources/wind';
import type { TideResult } from '@/lib/tide';
import type { DayRecord, Score, SwellSummary, WindSummary } from '@/lib/types';

function inSector(deg: number, sector: { min: number; max: number }): boolean {
  return deg >= sector.min && deg <= sector.max;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** The swell driving window [midnight(D) - hoursBefore, midnight(D) + hoursAfter]. */
export function swellWindow(dateStr: string): { start: Date; end: Date } {
  const mid = localMidnightUtc(dateStr).getTime();
  return {
    start: new Date(mid - SWELL_WINDOW.hoursBefore * 3600 * 1000),
    end: new Date(mid + SWELL_WINDOW.hoursAfter * 3600 * 1000),
  };
}

export function summariseSwell(series: SwellSeries, dateStr: string): { summary: SwellSummary; ok: boolean } {
  const { start, end } = swellWindow(dateStr);
  const pts = series.points.filter((p) => p.time >= start && p.time <= end);
  if (!series.ok || pts.length === 0) {
    return {
      ok: false,
      summary: { peakHeight: null, direction: null, period: null, favourableDirection: false, peakTimeLocal: null },
    };
  }
  let peak = pts[0];
  for (const p of pts) if (p.height > peak.height) peak = p;
  return {
    ok: true,
    summary: {
      peakHeight: round1(peak.height),
      direction: Math.round(peak.direction),
      period: round1(peak.period),
      favourableDirection: inSector(peak.direction, FAVOURABLE_SWELL_FROM),
      peakTimeLocal: local12h(peak.time),
    },
  };
}

export function summariseWind(series: WindSeries, dateStr: string): { summary: WindSummary; ok: boolean } {
  const { start, end } = swellWindow(dateStr);
  const pts = series.points.filter((p) => p.time >= start && p.time <= end);
  if (!series.ok || pts.length === 0) {
    return { ok: false, summary: { speed: null, direction: null, favourable: false } };
  }
  // Speed-weighted circular mean of the meteorological FROM bearing.
  let x = 0;
  let y = 0;
  let speedSum = 0;
  for (const p of pts) {
    const r = (p.direction * Math.PI) / 180;
    x += p.speed * Math.sin(r);
    y += p.speed * Math.cos(r);
    speedSum += p.speed;
  }
  let dir = (Math.atan2(x, y) * 180) / Math.PI;
  if (dir < 0) dir += 360;
  const meanSpeed = speedSum / pts.length;
  return {
    ok: true,
    summary: { speed: round1(meanSpeed), direction: Math.round(dir), favourable: inSector(dir, ONSHORE_WIND_FROM) },
  };
}

/** Best walk window: centred on the daytime low tide, clipped to daytime hours. */
export function walkWindow(low: Date): string {
  const dayStr = localDateStr(low);
  const dayStart = localMidnightUtc(dayStr).getTime() + DAYTIME_WINDOW.startHour * 3600 * 1000;
  const dayEnd = localMidnightUtc(dayStr).getTime() + DAYTIME_WINDOW.endHour * 3600 * 1000;
  const start = Math.max(dayStart, low.getTime() - WALK_WINDOW_HALF_MIN * 60 * 1000);
  const end = Math.min(dayEnd, low.getTime() + WALK_WINDOW_HALF_MIN * 60 * 1000);
  return `${local12h(new Date(start))} – ${local12h(new Date(end))}`;
}

export function buildWhy(score: Score, swell: SwellSummary, wind: WindSummary, tide: TideResult['summary']): string {
  const parts: string[] = [];

  if (swell.peakHeight == null) {
    parts.push('swell data unavailable');
  } else {
    const dir = swell.direction != null ? ` from ${degToCompass(swell.direction)}` : '';
    parts.push(`peak swell ${swell.peakHeight.toFixed(1)} m${dir}`);
  }

  if (wind.speed == null) {
    parts.push('wind data unavailable');
  } else {
    const label = wind.favourable ? 'onshore' : 'offshore/cross';
    const dir = wind.direction != null ? ` from ${degToCompass(wind.direction)}` : '';
    parts.push(`${label} wind ${Math.round(wind.speed)} km/h${dir}`);
  }

  if (tide.daytimeLowTide && tide.daytimeLowTideLocal) {
    parts.push(`daytime low tide ${tide.daytimeLowTideLocal}`);
  } else if (tide.method === 'none') {
    parts.push('tide data unavailable');
  } else {
    parts.push(`no low tide in the ${tide.window} window`);
  }

  const lead =
    score === 'PRIME'
      ? 'Prime combing: '
      : score === 'MODERATE'
        ? 'Worth a look: '
        : 'Poor prospects: ';
  return lead + parts.join(', ') + '.';
}

/** Score a single day from the fetched series and its tide result. */
export function scoreDay(dateStr: string, swellSeries: SwellSeries, windSeries: WindSeries, tide: TideResult): DayRecord {
  const swell = summariseSwell(swellSeries, dateStr);
  const wind = summariseWind(windSeries, dateStr);
  const daytimeLow = tide.summary.daytimeLowTide;
  const peak = swell.summary.peakHeight;

  let score: Score;
  if (!daytimeLow || peak == null || peak < SWELL_MODERATE_MIN) {
    score = 'POOR';
  } else if (wind.summary.favourable && peak > SWELL_PRIME_MIN && swell.summary.favourableDirection) {
    score = 'PRIME';
  } else {
    score = 'MODERATE';
  }

  return {
    date: dateStr,
    score,
    swell: swell.summary,
    wind: wind.summary,
    tide: tide.summary,
    bestWalkWindow: tide.daytimeLow ? walkWindow(tide.daytimeLow) : null,
    why: buildWhy(score, swell.summary, wind.summary, tide.summary),
    dataStatus: {
      swell: swell.ok ? 'ok' : 'failed',
      wind: wind.ok ? 'ok' : 'failed',
      tide: tide.status,
    },
  };
}
