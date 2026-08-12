import Link from 'next/link';
import { loadHistory } from '@/lib/history';
import { degToCompass } from '@/lib/compass';
import { THEME, friendly, hasFallback } from '@/lib/display';

// Same freshness as the home page — the committed history is re-read ~every 15
// minutes and never recomputed on load.
export const revalidate = 900;

export default async function HistoryPage() {
  const history = await loadHistory();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6 sm:py-10">
      <header className="flex flex-col gap-3">
        <Link
          href="/"
          className="w-fit text-base font-semibold text-[#fed404]/85 transition hover:text-[#fed404]"
        >
          <span aria-hidden>←</span> Back
        </Link>
        <h1 className="font-display text-3xl leading-tight tracking-tight text-[#fed404] sm:text-4xl">
          Full history
        </h1>
      </header>

      {history.length === 0 ? (
        <p className="text-base text-[#fed404]/75">No readings recorded yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {history.map((h, i) => {
            const t = THEME[h.score];
            return (
              <li
                key={h.date}
                className="flex flex-col gap-1.5 rounded-xl border border-[#fed404]/15 bg-[#54041b] px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-3">
                    <span className={`h-3 w-3 shrink-0 rounded-full ${t.pill}`} aria-hidden />
                    <span className="text-lg font-semibold">{i === 0 ? 'Today' : friendly(h.date)}</span>
                    {hasFallback(h) && <span title="Fallback data used" aria-hidden>⚠️</span>}
                  </span>
                  <span className={`rounded-full px-3 py-0.5 text-sm font-bold ${t.pill}`}>{t.label}</span>
                </div>
                <p className="pl-6 text-sm leading-snug text-[#fed404]/70">
                  {h.swell.peakHeight != null ? `${h.swell.peakHeight.toFixed(1)} m` : '—'}
                  {' · '}
                  {h.wind.direction != null
                    ? `wind ${degToCompass(h.wind.direction)}${h.wind.favourable ? ' ✓' : ''}`
                    : 'wind —'}
                  {' · '}
                  {h.tide.daytimeLowTideLocal ? `low ${h.tide.daytimeLowTideLocal}` : 'no daytime low tide'}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
