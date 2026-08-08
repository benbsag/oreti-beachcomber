import Dashboard from '@/app/dashboard';
import { loadHistory } from '@/lib/history';
import { SWELL_PRIME_MIN, SWELL_MODERATE_MIN, DAYTIME_WINDOW } from '@/lib/config';

// Read the frozen history (raw GitHub URL or committed file) and re-check ~every
// 15 minutes. We never recompute the assessment on load — the dashboard always
// shows the same numbers the daily alert was based on.
export const revalidate = 900;

/** Format a 24h hour as a friendly label, e.g. 8 -> "8am", 18 -> "6pm". */
function hourLabel(h: number): string {
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${h < 12 ? 'am' : 'pm'}`;
}

export default async function Page() {
  const history = await loadHistory();
  const dayStart = hourLabel(DAYTIME_WINDOW.startHour);
  const dayEnd = hourLabel(DAYTIME_WINDOW.endHour);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6 sm:py-10">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl leading-tight tracking-tight text-sky-50 sm:text-4xl">
          Oreti Beachcombing Conditions
        </h1>
      </header>

      <Dashboard history={history} />

      <section className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
        <h2 className="mb-3 text-base font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          How the rating works
        </h2>
        <ul className="grid grid-cols-[max-content_1fr] items-baseline gap-x-4 gap-y-3 text-base leading-snug">
          <li className="contents">
            <span className="w-fit rounded-full bg-emerald-600 px-3 py-0.5 text-sm font-black text-white">PRIME</span>
            <span>
              Onshore wind (blowing in from the SW–W), peak swell over {SWELL_PRIME_MIN} m out of the S–SW,
              and a low tide between {dayStart} and {dayEnd}.
            </span>
          </li>
          <li className="contents">
            <span className="w-fit rounded-full bg-amber-500 px-3 py-0.5 text-sm font-black text-stone-950">MODERATE</span>
            <span>
              A low tide between {dayStart} and {dayEnd} with peak swell of at least {SWELL_MODERATE_MIN} m —
              promising, but short of all the PRIME marks.
            </span>
          </li>
          <li className="contents">
            <span className="w-fit rounded-full bg-rose-700 px-3 py-0.5 text-sm font-black text-rose-50">POOR</span>
            <span>Peak swell under {SWELL_MODERATE_MIN} m, or no low tide during the day.</span>
          </li>
        </ul>
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          Conditions can shift through the day. If a day looks borderline, use these rules to weigh the
          live swell, wind and tide yourself.
        </p>
      </section>

      <footer className="mt-auto pt-4 text-center text-sm text-sky-200/80">
        Conditions are checked once a day. Data: Open-Meteo (swell &amp; wind) and harmonic tide
        prediction seeded with Bluff (LINZ) constituents. Not for navigation.
      </footer>
    </main>
  );
}
