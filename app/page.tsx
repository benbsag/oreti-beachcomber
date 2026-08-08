import Dashboard from '@/app/dashboard';
import { loadHistory } from '@/lib/history';

// Read the frozen history (raw GitHub URL or committed file) and re-check ~every
// 15 minutes. We never recompute the assessment on load — the dashboard always
// shows the same numbers the daily alert was based on.
export const revalidate = 900;

export default async function Page() {
  const history = await loadHistory();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6 sm:py-10">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl leading-tight tracking-tight text-sky-50 sm:text-4xl">
          Oreti Beachcombing Conditions
        </h1>
      </header>

      <Dashboard history={history} />

      <footer className="mt-auto pt-4 text-center text-sm text-sky-200/80">
        Conditions are checked once a day. Data: Open-Meteo (swell &amp; wind) and harmonic tide
        prediction seeded with Bluff (LINZ) constituents. Not for navigation.
      </footer>
    </main>
  );
}
