/** Presentation helpers shared by the dashboard and the full-history screen. */

import type { DayRecord, Score } from '@/lib/types';

/** Score → theme. Every score shares one muted-maroon pill with yellow ink:
    the rating is read from the word, not from a traffic-light colour. */
export const PILL = 'bg-[#873a53] text-[#fed404]';
export const RING = 'ring-[#fed404]/20';

export const THEME: Record<Score, { badge: string; pill: string; ring: string; label: string; blurb: string }> = {
  PRIME: {
    badge: PILL,
    pill: PILL,
    ring: RING,
    label: 'PRIME',
    blurb: 'Go now — wind & swell have driven debris ashore.',
  },
  MODERATE: {
    badge: PILL,
    pill: PILL,
    ring: RING,
    label: 'MODERATE',
    blurb: 'Worth a look if you are nearby.',
  },
  POOR: {
    badge: PILL,
    pill: PILL,
    ring: RING,
    label: 'POOR',
    blurb: 'Low potential today.',
  },
};

/** Local ISO date "YYYY-MM-DD" → "Mon, 10 Aug" (rendered in UTC to stay stable). */
export function friendly(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('en-NZ', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

/** True if any source for this day fell back to a secondary method. */
export function hasFallback(rec: DayRecord): boolean {
  return (
    rec.dataStatus.swell !== 'ok' ||
    rec.dataStatus.wind !== 'ok' ||
    rec.dataStatus.tide === 'fallback' ||
    rec.dataStatus.tide === 'failed'
  );
}
