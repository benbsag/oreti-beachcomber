/**
 * Timezone helpers. Everything is anchored to the location's local time
 * (Pacific/Auckland) which shifts +12 (NZST) / +13 (NZDT) across the year.
 * Dates are always real UTC instants; these helpers project them to/from local
 * wall time using the Intl timezone database (no hard-coded DST rules).
 */

import { LOCATION } from '@/lib/config';

const TZ = LOCATION.timezone;

const partsFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ,
  hour12: false,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

const time12Fmt = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ,
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

export interface LocalParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/** Break a UTC instant into its local (Pacific/Auckland) calendar/clock parts. */
export function localParts(date: Date): LocalParts {
  const out: Record<string, number> = {};
  for (const part of partsFmt.formatToParts(date)) {
    if (part.type !== 'literal') out[part.type] = Number(part.value);
  }
  // Some engines emit hour "24" for local midnight; normalise to 0.
  if (out.hour === 24) out.hour = 0;
  return out as unknown as LocalParts;
}

/** Milliseconds east of UTC for the zone at this instant (+12h or +13h here). */
export function tzOffsetMs(date: Date): number {
  const p = localParts(date);
  const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUTC - date.getTime();
}

/** Local date string "YYYY-MM-DD" for a UTC instant. */
export function localDateStr(date: Date): string {
  const p = localParts(date);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Local 24h "HH:MM" for a UTC instant. */
export function localHHMM(date: Date): string {
  const p = localParts(date);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

/** Local 12h time like "1:30 PM" for a UTC instant. */
export function local12h(date: Date): string {
  // Normalise the narrow no-break space some ICU builds insert before AM/PM.
  return time12Fmt.format(date).replace(/ /g, ' ');
}

/** The UTC instant of 00:00 local on the given "YYYY-MM-DD". */
export function localMidnightUtc(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  const naive = Date.UTC(y, m - 1, d, 0, 0, 0);
  // Correct by the zone offset at (approximately) that instant. Two passes make
  // this robust across the ~2 DST-transition days per year.
  let instant = new Date(naive - tzOffsetMs(new Date(naive)));
  instant = new Date(naive - tzOffsetMs(instant));
  return instant;
}

/** Today's local date "YYYY-MM-DD". */
export function todayLocalDateStr(now: Date = new Date()): string {
  return localDateStr(now);
}

/** Add whole days to a "YYYY-MM-DD" string (calendar arithmetic, DST-safe). */
export function addDaysLocal(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/**
 * Convert an Open-Meteo local ISO string (e.g. "2026-08-09T13:00", no zone,
 * returned when timezone= is set) into a real UTC instant, given the API's
 * reported utc_offset_seconds.
 */
export function localIsoToUtc(iso: string, utcOffsetSeconds: number): Date {
  const wallAsUtc = Date.parse(iso.endsWith('Z') ? iso : iso + 'Z');
  return new Date(wallAsUtc - utcOffsetSeconds * 1000);
}

/** Friendly local date like "Sat 9 Aug" for a "YYYY-MM-DD" string. */
export function friendlyDate(dateStr: string): string {
  const noon = new Date(localMidnightUtc(dateStr).getTime() + 12 * 3600 * 1000);
  return new Intl.DateTimeFormat('en-NZ', {
    timeZone: TZ,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(noon);
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
