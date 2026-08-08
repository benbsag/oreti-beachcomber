/**
 * History storage — a committed JSON array of daily snapshots (newest first).
 * No database. The daily Action reads/writes the file on disk; the web app
 * prefers the committed file's raw GitHub URL (with light caching) so data is
 * decoupled from redeploys, falling back to the on-disk file.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Snapshot } from '@/lib/types';

const HISTORY_PATH = path.join(process.cwd(), 'data', 'history.json');

function sortNewestFirst(history: Snapshot[]): Snapshot[] {
  return [...history].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/** Read the committed history file from disk (used by the daily script). */
export async function readHistoryFromDisk(): Promise<Snapshot[]> {
  try {
    const raw = await fs.readFile(HISTORY_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Snapshot[]) : [];
  } catch {
    return [];
  }
}

/** Write the history file back to disk (the Action commits it). */
export async function writeHistoryToDisk(history: Snapshot[]): Promise<void> {
  await fs.writeFile(HISTORY_PATH, JSON.stringify(sortNewestFirst(history), null, 2) + '\n');
}

/** Replace any existing record for the snapshot's date, then sort newest first. */
export function upsertSnapshot(history: Snapshot[], snap: Snapshot): Snapshot[] {
  const rest = history.filter((h) => h.date !== snap.date);
  return sortNewestFirst([snap, ...rest]);
}

/**
 * Load history for the web app. Prefers HISTORY_JSON_URL (raw GitHub URL) with
 * ~15 min revalidation, falling back to the committed file on disk.
 */
export async function loadHistory(): Promise<Snapshot[]> {
  const url = process.env.HISTORY_JSON_URL;
  if (url) {
    try {
      const res = await fetch(url, { next: { revalidate: 900 } });
      if (res.ok) {
        const parsed = await res.json();
        if (Array.isArray(parsed)) return sortNewestFirst(parsed as Snapshot[]);
      }
    } catch {
      // fall through to disk
    }
  }
  return sortNewestFirst(await readHistoryFromDisk());
}
