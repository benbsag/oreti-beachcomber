/**
 * Wind source — Open-Meteo Forecast API.
 * Wind direction is meteorological (the direction the wind blows FROM).
 * Never throws: on failure returns { ok: false, points: [] }.
 */

import { LOCATION } from '@/lib/config';
import { localIsoToUtc } from '@/lib/time';

const ENDPOINT = 'https://api.open-meteo.com/v1/forecast';

export interface WindPoint {
  time: Date;
  speed: number; // km/h
  direction: number; // deg FROM
}

export interface WindSeries {
  ok: boolean;
  points: WindPoint[];
  utcOffsetSeconds: number;
}

export async function fetchWind(forecastDays = 5, pastDays = 2): Promise<WindSeries> {
  const url = new URL(ENDPOINT);
  url.searchParams.set('latitude', String(LOCATION.latitude));
  url.searchParams.set('longitude', String(LOCATION.longitude));
  url.searchParams.set('hourly', 'wind_speed_10m,wind_direction_10m');
  url.searchParams.set('wind_speed_unit', 'kmh');
  url.searchParams.set('timezone', LOCATION.timezone);
  url.searchParams.set('past_days', String(pastDays));
  url.searchParams.set('forecast_days', String(forecastDays));

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`forecast http ${res.status}`);
    const j = await res.json();
    const off: number = j.utc_offset_seconds ?? 0;
    const t: string[] = j.hourly?.time ?? [];
    const s: (number | null)[] = j.hourly?.wind_speed_10m ?? [];
    const d: (number | null)[] = j.hourly?.wind_direction_10m ?? [];

    const points: WindPoint[] = [];
    for (let i = 0; i < t.length; i++) {
      if (s[i] == null || d[i] == null) continue;
      points.push({ time: localIsoToUtc(t[i], off), speed: s[i] as number, direction: d[i] as number });
    }
    return { ok: points.length > 0, points, utcOffsetSeconds: off };
  } catch {
    return { ok: false, points: [], utcOffsetSeconds: 0 };
  }
}
