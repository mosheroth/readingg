import { closeDb, postgresStore } from '../src/simania/db.ts'
import { runBackfill, runSample } from '../src/simania/jobs.ts'
import { createBrowserFetch } from './browser.ts'

const args = process.argv.slice(2)
const mode = args[0]

async function main() {
  if (mode !== 'sample' && mode !== 'backfill' && mode !== 'status') {
    console.error('usage: npm run crawl -- sample|backfill|status [--limit N]')
    process.exitCode = 1
    return
  }
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
    console.error('DATABASE_URL is not set')
    process.exitCode = 1
    return
  }
  if (mode === 'status') {
    const page = await postgresStore().listBooks({ modern: false, limit: 1, offset: 0, now: new Date() })
    console.log(JSON.stringify({ total: page.total, counts: page.counts, backfill: page.backfill }, null, 2))
    return
  }
  const browser = await createBrowserFetch()
  try {
    const report =
      mode === 'sample'
        ? await runSample({
            store: postgresStore(),
            fetchText: browser.fetchText,
            limit: flag('limit', 8),
            budgetMs: flag('budget', 70_000),
          })
        : await runBackfill({
            store: postgresStore(),
            fetchText: browser.fetchText,
            limit: flag('limit', 12),
            budgetMs: flag('budget', 120_000),
          })
    console.log(JSON.stringify(report, null, 2))
    if (!report.ok) process.exitCode = 1
  } finally {
    await browser.close()
  }
}

function flag(name: string, fallback: number): number {
  const index = args.indexOf(`--${name}`)
  if (index === -1) return fallback
  const value = Number(args[index + 1])
  return Number.isFinite(value) ? value : fallback
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeDb()
  })
