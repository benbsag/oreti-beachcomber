# Oreti Beach Beachcombing Predictor 🌊🪵

Predicts flotsam/driftwood (**beachcombing**) conditions at **Oreti Beach, Southland, New Zealand** (−46.45, 168.25; `Pacific/Auckland`) and pushes a **Telegram alert only when conditions are optimal**.

Two parts share one assessment core (`lib/`):

1. A **daily GitHub Action** computes the day's score, commits it to `data/history.json`, and sends a Telegram alert **only on PRIME days**.
2. A **mobile-first web dashboard** you can check any time, with scroll-back history.

> Conditions are checked **once a day**. The dashboard always shows the same numbers the alert was based on — it never recomputes on load.

---

## How the score works

A **Beachcombing Potential** score is computed from swell, wind, and tide for each day:

| Score | Meaning | Rule |
| --- | --- | --- |
| 🟢 **PRIME** | Go now | Onshore wind **and** peak swell **> 2.5 m** from the **S/SW** **and** a daytime low tide |
| 🟡 **MODERATE** | Worth a look | A daytime low tide **and** peak swell **≥ 1.5 m** (but not all PRIME criteria) |
| 🔴 **POOR** | Low potential | Peak swell **< 1.5 m**, **or** no low tide between 08:00–18:00 |

- **Daytime low tide** = a low tide falling between **08:00 and 18:00** local.
- **Best walk window** is centred on that low tide (±90 min, clipped to daylight).
- **Alerting is PRIME-only.** MODERATE and POOR are recorded and displayed but never pushed.

### Wind convention (not inverted)

Wind direction is **meteorological** — the bearing the wind blows **FROM**. Oreti Beach faces SW/W, so **onshore** (debris-pushing) wind comes **FROM ≈ 200°–290°** (SSW→WNW). Offshore/easterly wind blows debris back out to sea and is **not** favourable. Favourable **swell** arrives **FROM ≈ 170°–230°** (S→SW). All thresholds live in [`lib/config.ts`](lib/config.ts).

### Swell time-window

For a target day *D*, the score uses the **peak swell over the ~24–36 h leading into that day** (`[midnight(D) − 36 h, midnight(D) + 12 h]` local). "Today" is backward-looking (flotsam has already been driven ashore); each forecast day uses the same logic for consistency.

---

## Data sources (free, no auth)

- **Swell** — [Open-Meteo Marine API](https://open-meteo.com/en/docs/marine-weather-api) (`swell_wave_height/direction/period`).
- **Wind** — [Open-Meteo Forecast API](https://open-meteo.com/en/docs) (`wind_speed_10m`, `wind_direction_10m`).
- **Tide** — offline harmonic prediction (below), with a coarse sea-level fallback.

Every fetch is wrapped in try/catch with typed fallbacks; a single failed endpoint never crashes the assessment — the affected field is marked unavailable and shown with a ⚠️ indicator.

---

## Tide prediction

**Primary — harmonic (offline):** [`@neaps/tide-predictor`](https://www.npmjs.com/package/@neaps/tide-predictor) seeded with the harmonic constituents for **Bluff**, the LINZ standard port nearest Oreti Beach (~18 km), committed as [`data/constituents.bluff.json`](data/constituents.bluff.json). Oreti Beach is applied as a **secondary station** via a time offset from Bluff ([`ORETI_OFFSET` in `lib/config.ts`](lib/config.ts)).

**Constituent source:** the 50-constituent Bluff record `ticon/bluff-072-nzl-uhslc_fd` from the **TICON-4** global dataset (UHSLC), obtained via [`openwatersio/tide-database`](https://github.com/openwatersio/tide-database) — CC-BY-4.0. Regenerate any time with:

```bash
npm run extract-constituents
```

> **One-time sanity check (please do this):** compare the committed Bluff low-tide times against the official **[LINZ Bluff tide table](https://www.linz.govt.nz/products-services/tides-and-tidal-streams/tide-predictions)** for a few dates. We only use low-tide **timing** (never height or datum), so a small offset is harmless — but confirm the timing is right for your area, and tune `ORETI_OFFSET` if you have a published Oreti/Riverton offset.

**Fallback:** if constituents are missing or the harmonic call throws, low tides are derived from Open-Meteo `sea_level_height_msl` local minima (coarse at ~8 km — last resort only). Days using it are flagged `tide: fallback`.

---

## Storage & history

Each day's snapshot (today **+ 3-day forecast**) is one entry in [`data/history.json`](data/history.json) — a committed array, newest first. No database. The daily Action appends and commits it; that gives free scroll-back history and survives redeploys. Record shape is documented in [`lib/types.ts`](lib/types.ts) (`Snapshot`).

---

## Local development

```bash
npm install
npm run dev            # dashboard at http://localhost:3000
npm run daily-check    # compute today + forecast, write data/history.json
```

`daily-check` without Telegram env vars just records history and logs that no alert was sent.

---

## Deploy the web app (Vercel)

1. Push this repo to GitHub.
2. Import it at [vercel.com/new](https://vercel.com/new) (framework auto-detected as Next.js).
3. Set env var **`HISTORY_JSON_URL`** to the raw URL of your committed history so the deployed app shows fresh data **without redeploying** (it revalidates every ~15 min):
   ```
   https://raw.githubusercontent.com/<user>/<repo>/main/data/history.json
   ```
   If unset, the app falls back to the file committed at build time.

---

## Set up the daily alert (GitHub Action)

The workflow [`.github/workflows/daily-check.yml`](.github/workflows/daily-check.yml) runs `scripts/daily-check.mts`, commits history, and alerts on PRIME.

### 1. Create a Telegram bot & get chat IDs

1. In Telegram, message **[@BotFather](https://t.me/BotFather)** → `/newbot` → copy the **bot token**.
2. Get your **chat ID**: message **[@userinfobot](https://t.me/userinfobot)**, or send your bot a message and open `https://api.telegram.org/bot<TOKEN>/getUpdates` and read `result[].message.chat.id`.
3. For **multiple** recipients, each person messages the bot once (so it can DM them); collect each `chat.id` and join with commas: `TELEGRAM_CHAT_IDS=111,222,333` (up to ~10).

### 2. Add repository secrets

**Settings → Secrets and variables → Actions → New repository secret:**

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_IDS`

The history commit uses the **built-in `GITHUB_TOKEN`** — no extra secret needed (the workflow declares `permissions: contents: write`).

### 3. Schedule & daylight saving

GitHub cron is **UTC**. The default schedule `30 18 * * *` is:

- **~07:30** during **NZDT** (summer, UTC+13)
- **~06:30** during **NZST** (winter, UTC+12)

i.e. a ~1 h drift across daylight saving — fine for a once-a-day check.

**Want an exact ~07:30 year-round?** Uncomment the second cron (`30 19 * * *`) *and* `EXACT_LOCAL_HOUR: '7'` in the workflow. Both runs then fire, but each early-exits unless the local hour is 07, so exactly one does the work each day.

You can also trigger it any time from the **Actions** tab (`workflow_dispatch`).

---

## Optional API route (Vercel Cron path)

[`app/api/cron/check-alerts`](app/api/cron/check-alerts/route.ts) runs the **same** assessment and sends the PRIME alert, protected by **`CRON_SECRET`**:

```
GET /api/cron/check-alerts     Authorization: Bearer <CRON_SECRET>
```

⚠️ This route **does not persist history** — a serverless function can't commit to the repo — so scroll-back history won't grow from it. **The GitHub Action is the recommended path** (it records history *and* alerts).

---

## Environment variables

See [`.env.example`](.env.example). Copy to `.env.local` for local runs.

| Var | Used by | Purpose |
| --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | Action / API route | Bot token from @BotFather |
| `TELEGRAM_CHAT_IDS` | Action / API route | Comma-separated chat IDs |
| `CRON_SECRET` | API route | Protects the optional route |
| `HISTORY_JSON_URL` | Web app | Raw URL of `data/history.json` (optional) |

---

## Tech

Next.js (App Router) · React · TypeScript · Tailwind CSS · `@neaps/tide-predictor`. Shared core in `lib/` (`sources/*`, `tide.ts`, `assess.ts`, `snapshot.ts`) is used by **both** the Action script and the web app. Secrets never reach client code — Telegram sends only from the Action/route.

*Not for navigation. Tide predictions exclude storm surge, wind setup, and other non-astronomical effects.*
