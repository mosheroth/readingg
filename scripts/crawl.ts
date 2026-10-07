import { csvStore } from '../src/simania/csv.ts'
import { closeDb, postgresStore } from '../src/simania/db.ts'
import { runBackfill, runBookPages, runSample } from '../src/simania/jobs.ts'
import { createBrowserFetch } from './browser.ts'

const args = process.argv.slice(2)
const mode = args[0]
const CSV_PATH = 'data/simania-reviews.csv'

async function main() {
  if (mode !== 'sample' && mode !== 'backfill' && mode !== 'status' && mode !== 'csv' && mode !== 'books') {
    console.error('usage: npm run crawl -- sample|backfill|status|csv|books [--limit N] [--out file.csv]')
    process.exitCode = 1
    return
  }
  if (mode === 'csv') {
    await runCsv()
    return
  }
  if (mode === 'books') {
    await runBooks()
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

async function runBooks() {
  const file = stringFlag('out', CSV_PATH)
  const store = csvStore(file)
  const browser = await createBrowserFetch()
  let fetched = 0
  try {
    const report = await runBookPages({
      store,
      fetchText: async (url) => {
        const html = await browser.fetchText(url)
        fetched += 1
        if (fetched % 25 === 0) console.error(`book pages ${fetched}`)
        return html
      },
      limit: flag('limit', 300),
      budgetMs: flag('budget', 900_000),
    })
    const pending = await store.pendingBookIds()
    console.log(JSON.stringify({ ...report, file, pending: pending.length }, null, 2))
    if (!report.ok) process.exitCode = 1
  } finally {
    await browser.close()
  }
}

async function runCsv() {
  const file = stringFlag('out', CSV_PATH)
  const store = csvStore(file)
  const browser = await createBrowserFetch()
  let fetched = 0
  try {
    const report = await runBackfill({
      store,
      fetchText: async (url) => {
        const html = await browser.fetchText(url)
        if (url.includes('showReview.php')) {
          fetched += 1
          if (fetched % 25 === 0) console.error(`fetched ${fetched}, cursor walking`)
        }
        return html
      },
      limit: flag('limit', 400),
      budgetMs: flag('budget', 900_000),
    })
    const page = await store.listBooks({ modern: false, limit: 1, offset: 0, now: new Date() })
    console.log(JSON.stringify({ ...report, file, reviews: page.counts.reviews, books: page.counts.books }, null, 2))
    if (!report.ok) process.exitCode = 1
  } finally {
    await browser.close()
  }
}

function stringFlag(name: string, fallback: string): string {
  const index = args.indexOf(`--${name}`)
  if (index === -1 || !args[index + 1]) return fallback
  return args[index + 1]
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
