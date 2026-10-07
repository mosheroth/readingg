import { cronAllowed } from './auth'
import { databaseUrl, postgresStore } from './db'
import { runBackfill, runSample, type JobReport } from './jobs'
import { modernPublishedYear } from './parse'

export { cronAllowed }

export async function plainFetch(url: string): Promise<string> {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      accept: 'text/html,application/xhtml+xml',
      'accept-language': 'he-IL,he;q=0.9,en;q=0.8',
      'user-agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    },
  })
  return response.text()
}

export async function booksPayload(requestUrl: string): Promise<{ status: number; body: unknown }> {
  if (!databaseUrl()) {
    return {
      status: 503,
      body: {
        ok: false,
        error: 'המאגר עדיין לא מחובר. צריך DATABASE_URL של Vercel Postgres.',
        modernSinceYear: modernPublishedYear(new Date()),
        books: [],
        total: 0,
      },
    }
  }
  const url = new URL(requestUrl, 'https://catalog.local')
  const modern = url.searchParams.get('modern') !== '0'
  const limit = clamp(Number(url.searchParams.get('limit') ?? 24), 1, 48)
  const offset = clamp(Number(url.searchParams.get('offset') ?? 0), 0, 10_000)
  try {
    const page = await postgresStore().listBooks({ modern, limit, offset, now: new Date() })
    return { status: 200, body: { ok: true, ...page } }
  } catch (error) {
    return { status: 500, body: { ok: false, error: error instanceof Error ? error.message : 'query failed', books: [], total: 0 } }
  }
}

export async function samplePayload(): Promise<{ status: number; body: JobReport | { ok: false; error: string } }> {
  if (!databaseUrl()) return { status: 503, body: { ok: false, error: 'DATABASE_URL is not set' } }
  const report = await runSample({ store: postgresStore(), fetchText: plainFetch, limit: 12, budgetMs: 50_000 })
  return { status: 200, body: report }
}

export async function backfillPayload(): Promise<{ status: number; body: JobReport | { ok: false; error: string } }> {
  if (!databaseUrl()) return { status: 503, body: { ok: false, error: 'DATABASE_URL is not set' } }
  const report = await runBackfill({ store: postgresStore(), fetchText: plainFetch, limit: 40, budgetMs: 240_000 })
  return { status: 200, body: report }
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.floor(value)))
}
