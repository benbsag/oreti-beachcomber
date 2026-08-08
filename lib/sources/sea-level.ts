/**
 * Sea-level source — Open-Meteo Marine `sea_level_height_msl`.
 * This is ONLY used as a fallback for tide timing when harmonic prediction is
 * unavailable. Open-Meteo warns this is coarse at ~8 km resolution, so it is a
 * last resort, not the primary method. Never throws.
 */

import { LOCATION } from '@/lib/config';
import { localIsoToUtc } from '@/lib/time';

const ENDPOINT = 'https://marine-api.open-meteo.com/v1/marine';

export interface LevelPoint {
  time: Date;
  level: number; // m relative to MSL
}

export interface LevelSeries {
  ok: boolean;
  points: LevelPoint[];
  utcOffsetSeconds: number;
}

export async function fetchSeaLevel(forecastDays = 5, pastDays = 2): Promise<LevelSeries> {
  const url = new URL(ENDPOINT);
  url.searchParams.set('latitude', String(LOCATION.latitude));
  url.searchParams.set('longitude', String(LOCATION.longitude));
  url.searchParams.set('hourly', 'sea_level_height_msl');
  url.searchParams.set('timezone', LOCATION.timezone);
  url.searchParams.set('past_days', String(pastDays));
  url.searchParams.set('forecast_days', String(forecastDays));

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`marine http ${res.status}`);
    const j = await res.json();
    const off: number = j.utc_offset_seconds ?? 0;
    const t: string[] = j.hourly?.time ?? [];
    const l: (number | null)[] = j.hourly?.sea_level_height_msl ?? [];

    const points: LevelPoint[] = [];
    for (let i = 0; i < t.length; i++) {
      if (l[i] == null) continue;
      points.push({ time: localIsoToUtc(t[i], off), level: l[i] as number });
    }
    return { ok: points.length > 0, points, utcOffsetSeconds: off };
  } catch {
    return { ok: false, points: [], utcOffsetSeconds: 0 };
  }
}
