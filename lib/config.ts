/**
 * Central configuration for the Oreti Beach beachcombing predictor.
 * All scoring thresholds and geographic constants live here so the logic is
 * easy to audit and tune in one place.
 */

export const LOCATION = {
  name: 'Oreti Beach',
  region: 'Southland, New Zealand',
  latitude: -46.45,
  longitude: 168.25,
  timezone: 'Pacific/Auckland',
} as const;

/** Public dashboard URL, linked from the Telegram alert. */
export const SITE_URL = 'https://oreti-beachcomber.vercel.app/';

/** Swell height thresholds, in metres (peak swell over the driving window). */
export const SWELL_PRIME_MIN = 2.5;
export const SWELL_MODERATE_MIN = 1.5;

/**
 * Wind convention is METEOROLOGICAL: the bearing is the direction the wind
 * blows FROM. Oreti Beach faces roughly SW/W, so onshore (debris-pushing) wind
 * comes FROM the W/SW sector. Do NOT invert this — offshore/easterly wind blows
 * floating debris back out to sea and is NOT favourable.
 */
export const ONSHORE_WIND_FROM = { min: 200, max: 290 }; // SSW -> WNW

/** Favourable swell arrives FROM the S -> SW sector. */
export const FAVOURABLE_SWELL_FROM = { min: 170, max: 230 }; // S -> SW

/** A "daytime" low tide falls within these local (Pacific/Auckland) hours. */
export const DAYTIME_WINDOW = { startHour: 8, endHour: 18 };

/** Best-walk window is centred on the daytime low tide, +/- this many minutes. */
export const WALK_WINDOW_HALF_MIN = 90;

/**
 * Swell driving window. For a target local day D we take the PEAK swell over
 * [midnight(D) - hoursBefore, midnight(D) + hoursAfter] local. This captures the
 * "24-36 h leading into that day" that drives flotsam ashore, and applies
 * identically to today (backward-looking) and each forecast day.
 */
export const SWELL_WINDOW = { hoursBefore: 36, hoursAfter: 12 };

/**
 * Oreti Beach as a SECONDARY station relative to Bluff (the LINZ standard port,
 * ~18 km ESE, whose harmonic constituents are committed in
 * data/constituents.bluff.json).
 *
 * NOTE: This is an APPROXIMATION. No official LINZ Oreti secondary-port offset is
 * published. The open Foveaux Strait coast turns marginally before the inside of
 * Bluff Harbour, but because we only use low-tide TIMING within an 08:00-18:00
 * window (never height or datum), a few tens of minutes has no material effect on
 * the score. The offset mechanism is wired through so it can be tuned once the
 * user sanity-checks against the official LINZ Bluff tide table (see README).
 *
 * Values are minutes added to the Bluff extreme times (negative = earlier).
 */
export const ORETI_OFFSET = {
  time: { high: 0, low: 0 },
} as const;
