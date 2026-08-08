/**
 * Regenerate data/constituents.bluff.json from @neaps/tide-database (TICON-4).
 *
 * Bluff is the LINZ standard port nearest Oreti Beach (~18 km). We use the
 * TICON-4 / UHSLC record `ticon/bluff-072-nzl-uhslc_fd` (50 constituents,
 * CC-BY-4.0). Run with: npm run extract-constituents
 *
 * If you ever need a different Foveaux Strait reference, change STATION_ID and
 * note the substitution in the README.
 */

import { writeFileSync } from 'node:fs';
import path from 'node:path';
import * as db from '@neaps/tide-database';

const STATION_ID = 'ticon/bluff-072-nzl-uhslc_fd';

const station = db.allStations.find((s) => s.id === STATION_ID);
if (!station) {
  console.error(`Station ${STATION_ID} not found in @neaps/tide-database.`);
  process.exit(1);
}

const output = {
  station: station.name,
  stationId: station.id,
  source: station.source,
  license: station.license,
  latitude: station.latitude,
  longitude: station.longitude,
  timezone: station.timezone,
  chart_datum: station.chart_datum,
  datums: station.datums,
  epoch: station.epoch,
  note:
    'Harmonic constituents for Bluff (LINZ standard port nearest Oreti Beach, ~18 km). ' +
    'Sourced from TICON-4 (UHSLC) via @neaps/tide-database, CC-BY-4.0. Used with ' +
    '@neaps/tide-predictor. Oreti Beach is applied as a secondary station via a small ' +
    'time offset (see lib/config.ts). Datum does not matter here — we only use low-tide ' +
    'TIMING. Sanity-check once against the official LINZ Bluff tide table.',
  constituents: station.harmonic_constituents.map((c) => ({
    name: c.name,
    amplitude: c.amplitude,
    phase: c.phase,
  })),
};

const outPath = path.join(process.cwd(), 'data', 'constituents.bluff.json');
writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n');
console.log(`Wrote ${output.constituents.length} constituents for "${output.station}" to ${outPath}`);
