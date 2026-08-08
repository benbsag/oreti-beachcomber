/**
 * Swell source — Open-Meteo Marine API.
 * Uses the dedicated swell wave variables (not just combined waves).
 * Never throws: on any failure it returns { ok: false, points: [] } so the
 * assessment can degrade gracefully and mark swell unavailable.
 */

import { LOCATION } from '@/lib/config';
import { localIsoToUtc } from '@/lib/time';

const ENDPOINT = 'https://marine-api.open-meteo.com/v1/marine';

export interface SwellPoint {
  time: Date;
  height: number; // m
  direction: number; // deg FROM
  period: number; // s
}

export interface SwellSeries {
  ok: boolean;
  points: SwellPoint[];
  utcOffsetSeconds: number;
}

export async function fetchSwell(forecastDays = 5, pastDays = 2): Promise<SwellSeries> {
  const url = new URL(ENDPOINT);
  url.searchParams.set('latitude', String(LOCATION.latitude));
  url.searchParams.set('longitude', String(LOCATION.longitude));
  url.searchParams.set('hourly', 'swell_wave_height,swell_wave_direction,swell_wave_period');
  url.searchParams.set('timezone', LOCATION.timezone);
  url.searchParams.set('past_days', String(pastDays));
  url.searchParams.set('forecast_days', String(forecastDays));

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`marine http ${res.status}`);
    const j = await res.json();
    const off: number = j.utc_offset_seconds ?? 0;
    const t: string[] = j.hourly?.time ?? [];
    const h: (number | null)[] = j.hourly?.swell_wave_height ?? [];
    const d: (number | null)[] = j.hourly?.swell_wave_direction ?? [];
    const p: (number | null)[] = j.hourly?.swell_wave_period ?? [];

    const points: SwellPoint[] = [];
    for (let i = 0; i < t.length; i++) {
      if (h[i] == null || d[i] == null) continue;
      points.push({
        time: localIsoToUtc(t[i], off),
        height: h[i] as number,
        direction: d[i] as number,
        period: (p[i] as number) ?? 0,
      });
    }
    return { ok: points.length > 0, points, utcOffsetSeconds: off };
  } catch {
    return { ok: false, points: [], utcOffsetSeconds: 0 };
  }
}
