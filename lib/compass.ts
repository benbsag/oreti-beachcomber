/** Compass helpers shared by the assessment core, the Telegram alert, and the UI. */

const POINTS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'] as const;

/** Meteorological bearing (degrees the wind/swell comes FROM) → 16-point abbreviation. */
export function degToCompass(deg: number): string {
  return POINTS[Math.round(deg / 22.5) % 16];
}
