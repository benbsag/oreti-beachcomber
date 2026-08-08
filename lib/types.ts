/** Shared types used by the assessment core, the daily script, and the web app. */

export type Score = 'PRIME' | 'MODERATE' | 'POOR';

/** Per-source health for a given day's assessment. */
export type SourceStatus = 'ok' | 'fallback' | 'failed';

export interface SwellSummary {
  /** Peak swell height over the driving window (m), or null if unavailable. */
  peakHeight: number | null;
  /** Direction the peak swell comes FROM (degrees), meteorological convention. */
  direction: number | null;
  /** Swell period at the peak (s). */
  period: number | null;
  /** True if the peak swell arrives FROM the favourable S->SW sector. */
  favourableDirection: boolean;
  /** Local time of the peak swell, human-readable (e.g. "2:00 AM"). */
  peakTimeLocal: string | null;
}

export interface WindSummary {
  /** Mean wind speed over the driving window (km/h). */
  speed: number | null;
  /** Dominant direction the wind blows FROM (degrees), speed-weighted mean. */
  direction: number | null;
  /** True if the dominant wind is onshore (favourable). */
  favourable: boolean;
}

export interface TideSummary {
  /** All low-tide times for the day, local "HH:MM" (24h). */
  lowTides: string[];
  /** True if any low tide falls within the daytime window. */
  daytimeLowTide: boolean;
  /** The first daytime low tide, local "HH:MM", or null. */
  daytimeLowTideLocal: string | null;
  /** The daytime window used, e.g. "08:00-18:00". */
  window: string;
  /** Which method produced these tides. */
  method: 'harmonic' | 'sea_level_fallback' | 'none';
}

export interface DataStatus {
  swell: SourceStatus;
  wind: SourceStatus;
  tide: SourceStatus;
}

/** A single day's assessment. */
export interface DayRecord {
  /** Local ISO date, "YYYY-MM-DD". */
  date: string;
  score: Score;
  swell: SwellSummary;
  wind: WindSummary;
  tide: TideSummary;
  /** Human-readable best walk window, e.g. "1:30 PM – 4:00 PM", or null. */
  bestWalkWindow: string | null;
  /** Short plain-language explanation of the score. */
  why: string;
  dataStatus: DataStatus;
}

/**
 * The frozen daily snapshot: today's record plus the 3-day forecast, computed
 * once per day. This is exactly what is stored in data/history.json (an array of
 * these, newest first) and what the dashboard renders as-is on check-in.
 */
export interface Snapshot extends DayRecord {
  forecast: DayRecord[];
  /** When this snapshot was computed (UTC ISO). */
  generatedAt: string;
}
