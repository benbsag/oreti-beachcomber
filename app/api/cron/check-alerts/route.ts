/**
 * Optional CRON_SECRET-protected alert route, for anyone who prefers a Vercel
 * Cron trigger over the GitHub Action. It runs the SAME shared assessment and
 * sends the PRIME-only Telegram alert.
 *
 * IMPORTANT: this route does NOT persist history — a serverless function cannot
 * commit back to the repo. The GitHub Action remains the recommended path (it
 * both records history AND alerts). See the README.
 *
 * Auth: send the secret as `Authorization: Bearer <CRON_SECRET>` (how Vercel Cron
 * sends it) or `?secret=<CRON_SECRET>`.
 */

import type { NextRequest } from 'next/server';
import { buildSnapshot } from '@/lib/snapshot';
import { sendPrimeAlert, type TelegramResult } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: 'CRON_SECRET is not configured' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const provided = bearer ?? request.nextUrl.searchParams.get('secret');
  if (provided !== secret) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const snapshot = await buildSnapshot();
  let telegram: TelegramResult | null = null;
  if (snapshot.score === 'PRIME') {
    telegram = await sendPrimeAlert(snapshot);
  }

  return Response.json({
    date: snapshot.date,
    score: snapshot.score,
    alerted: snapshot.score === 'PRIME',
    telegram,
    note: 'This route does not persist history; use the GitHub Action for scroll-back history.',
  });
}
