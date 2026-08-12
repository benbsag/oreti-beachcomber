'use client';

import { useState } from 'react';
import Link from 'next/link';
import { degToCompass } from '@/lib/compass';
import { THEME, friendly, hasFallback } from '@/lib/display';
import type { DayRecord, Snapshot } from '@/lib/types';

/** How many recent days the home page lists before the "Older" link. */
const RECENT_DAYS = 3;

export default function Dashboard({ history }: { history: Snapshot[] }) {
  const [selectedDate, setSelectedDate] = useState<string>(history[0]?.date ?? '');

  if (history.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-[#fed404]/30 p-8 text-center">
        <p className="text-xl font-semibold">No readings yet</p>
        <p className="mt-2 text-base text-[#fed404]/75">
          The daily check runs at about 07:30 NZ time and records the day&apos;s score here.
        </p>
      </section>
    );
  }

  const selected = history.find((h) => h.date === selectedDate) ?? history[0];
  const isToday = selected.date === history[0].date;
  const theme = THEME[selected.score];
  const recent = history.slice(0, RECENT_DAYS);
  const lastPrime = history.find((h) => h.score === 'PRIME') ?? null;

  return (
    <div className="flex flex-col gap-6">
      {/* Hero status */}
      <section className={`rounded-3xl p-6 text-center shadow-sm ring-8 ${theme.ring} ${theme.badge}`}>
        <p className="text-sm font-bold uppercase tracking-widest opacity-90">
          {isToday ? 'Today' : friendly(selected.date)}
        </p>
        <p className="mt-1 text-6xl font-black leading-none tracking-tight sm:text-7xl">{theme.label}</p>
        <p className="mt-3 text-base font-semibold opacity-95">{theme.blurb}</p>
        {selected.score === 'PRIME' && (
          <p className="mt-2 text-lg font-black tracking-tight">Get out and find some logs! 🪵</p>
        )}

        {selected.bestWalkWindow && (
          <div className="mt-5 rounded-2xl bg-black/15 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-widest opacity-90">Best walk window</p>
            <p className="text-3xl font-black">{selected.bestWalkWindow}</p>
          </div>
        )}
      </section>

      {/* Why + metrics */}
      <section className="rounded-2xl border border-[#fed404]/15 bg-[#54041b] p-5 shadow-sm">
        <p className="text-lg font-semibold leading-snug">{selected.why}</p>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <Metric
            label="Swell"
            value={selected.swell.peakHeight != null ? `${selected.swell.peakHeight.toFixed(1)} m` : '—'}
            sub={
              selected.swell.direction != null
                ? `from ${degToCompass(selected.swell.direction)}${selected.swell.favourableDirection ? ' ✓' : ''}`
                : 'unavailable'
            }
          />
          <Metric
            label="Wind"
            value={selected.wind.speed != null ? `${Math.round(selected.wind.speed)}` : '—'}
            unit={selected.wind.speed != null ? 'km/h' : undefined}
            sub={
              selected.wind.direction != null
                ? `from ${degToCompass(selected.wind.direction)} ${selected.wind.favourable ? 'onshore ✓' : 'not onshore'}`
                : 'unavailable'
            }
          />
          <Metric
            label="Low tide"
            value={selected.tide.daytimeLowTideLocal ?? (selected.tide.lowTides[0] ?? '—')}
            sub={selected.tide.daytimeLowTide ? `daytime (${selected.tide.window})` : `none in ${selected.tide.window}`}
          />
        </div>

        {hasFallback(selected) && (
          <p className="mt-4 flex items-center gap-2 rounded-lg bg-[#450316] px-3 py-2 text-xs font-medium text-[#fed404]/85">
            <span aria-hidden>⚠️</span>
            Some data used a fallback this day
            {selected.dataStatus.tide !== 'ok' ? ` (tide: ${selected.dataStatus.tide})` : ''}.
          </p>
        )}
      </section>

      {/* 3-day forecast */}
      {selected.forecast.length > 0 && (
        <section>
          <h2 className="mb-2 px-1 text-base font-bold uppercase tracking-wide text-[#fed404]/90">
            3-day forecast
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {selected.forecast.map((f) => (
              <ForecastCard key={f.date} day={f} />
            ))}
          </div>
        </section>
      )}

      {/* Scroll-back history */}
      <section>
        <h2 className="mb-2 px-1 text-sm font-bold uppercase tracking-wide text-[#fed404]/70">
          History
        </h2>
        <ul className="flex flex-col gap-2">
          {recent.map((h) => {
            const t = THEME[h.score];
            const active = h.date === selected.date;
            const isFirst = h.date === history[0].date;
            return (
              <li key={h.date}>
                <button
                  type="button"
                  onClick={() => setSelectedDate(h.date)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition ${
                    active
                      ? 'border-[#fed404]/60 bg-[#450316]'
                      : 'border-[#fed404]/15 bg-[#54041b] hover:bg-[#450316]'
                  }`}
                  aria-pressed={active}
                >
                  <span className="flex items-center gap-3">
                    <span className={`h-3 w-3 shrink-0 rounded-full ${t.pill}`} aria-hidden />
                    <span className="text-lg font-semibold">{isFirst ? 'Today' : friendly(h.date)}</span>
                    {hasFallback(h) && <span title="Fallback data used" aria-hidden>⚠️</span>}
                  </span>
                  <span className={`rounded-full px-3 py-0.5 text-sm font-bold ${t.pill}`}>{t.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
        {history.length > RECENT_DAYS && (
          <Link
            href="/history"
            className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-[#fed404]/15 bg-[#54041b] px-4 py-3 text-base font-semibold text-[#fed404]/85 transition hover:bg-[#450316]"
          >
            Older <span aria-hidden>→</span>
          </Link>
        )}
      </section>

      {/* Last prime day */}
      <section className="rounded-2xl border border-[#fed404]/15 bg-[#54041b] p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#fed404]/70">
          Last prime day
        </h2>
        {lastPrime ? (
          <div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-2xl font-black">{friendly(lastPrime.date)}</span>
              <span className={`rounded-full px-3 py-0.5 text-sm font-black ${THEME.PRIME.pill}`}>PRIME</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <Metric
                label="Swell"
                value={lastPrime.swell.peakHeight != null ? `${lastPrime.swell.peakHeight.toFixed(1)} m` : '—'}
                sub={lastPrime.swell.direction != null ? `from ${degToCompass(lastPrime.swell.direction)}` : 'unavailable'}
              />
              <Metric
                label="Wind"
                value={lastPrime.wind.speed != null ? `${Math.round(lastPrime.wind.speed)}` : '—'}
                unit={lastPrime.wind.speed != null ? 'km/h' : undefined}
                sub={lastPrime.wind.direction != null ? `from ${degToCompass(lastPrime.wind.direction)}` : 'unavailable'}
              />
              <Metric
                label="Low tide"
                value={lastPrime.tide.daytimeLowTideLocal ?? (lastPrime.tide.lowTides[0] ?? '—')}
                sub={lastPrime.tide.daytimeLowTide ? `daytime (${lastPrime.tide.window})` : `none in ${lastPrime.tide.window}`}
              />
            </div>
          </div>
        ) : (
          <p className="text-lg font-semibold text-[#fed404]/85">Waiting for breeze</p>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value, unit, sub }: { label: string; value: string; unit?: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-[#450316] p-3 text-center">
      <p className="text-sm font-bold uppercase tracking-widest text-[#fed404]/70">{label}</p>
      <p className="mt-1 text-2xl font-black leading-tight">
        {value}
        {unit && <span className="ml-0.5 text-sm font-semibold text-[#fed404]/70">{unit}</span>}
      </p>
      {sub && <p className="mt-1 text-sm leading-snug text-[#fed404]/70">{sub}</p>}
    </div>
  );
}

function ForecastCard({ day }: { day: DayRecord }) {
  const t = THEME[day.score];
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-[#fed404]/15 bg-[#54041b] p-3 text-center shadow-sm">
      <p className="flex min-h-[3rem] items-center justify-center text-center text-base font-semibold text-[#fed404]/85">
        {friendly(day.date)}
      </p>
      <span className={`rounded-full px-3 py-0.5 text-sm font-black ${t.pill}`}>{t.label}</span>
      <p className="text-sm leading-tight text-[#fed404]/70">
        {day.swell.peakHeight != null ? `${day.swell.peakHeight.toFixed(1)} m` : '—'}
      </p>
      <p className="text-sm leading-tight text-[#fed404]/70">
        {day.wind.direction != null
          ? `wind ${degToCompass(day.wind.direction)}${day.wind.favourable ? ' ✓' : ''}`
          : '—'}
      </p>
      <p className="text-sm leading-tight text-[#fed404]/70">
        {day.tide.daytimeLowTideLocal ? `low ${day.tide.daytimeLowTideLocal}` : 'no daytime low tide'}
      </p>
    </div>
  );
}
