import { appearanceCutoff, bookPageUrl, emptyBookMeta, feedUrl, isChallenge, parseBookPage, parseFeedIds, parseReviewPage, reviewPageUrl, type BookMeta } from './parse'
import type { CatalogStore } from './store'

export interface JobReport {
  ok: boolean
  mode: 'sample' | 'backfill' | 'books'
  blocked?: boolean
  skipped?: string
  fetched: number
  saved: number
  missing: number
  done?: boolean
  cursor?: number | null
  error?: string
}

interface JobOptions {
  store: CatalogStore
  fetchText: (url: string) => Promise<string>
  now?: Date
  limit?: number
  budgetMs?: number
  gapMs?: number
  oldStreakLimit?: number
  sleep?: (ms: number) => Promise<void>
}

const EMPTY = { fetched: 0, saved: 0, missing: 0 }

export async function runSample(options: JobOptions): Promise<JobReport> {
  const limit = options.limit ?? 12
  const budgetMs = options.budgetMs ?? 55_000
  const gapMs = options.gapMs ?? 1100
  const sleep = options.sleep ?? delay
  const deadline = Date.now() + budgetMs
  try {
    await options.store.ensure()
    const locked = await options.store.tryLock('sample', Math.ceil(budgetMs / 1000) + 30)
    if (!locked) return { ok: true, mode: 'sample', skipped: 'locked', ...EMPTY }
    try {
      const feed = await options.fetchText(feedUrl())
      if (isChallenge(feed)) return { ok: false, mode: 'sample', blocked: true, ...EMPTY }
      const ids = parseFeedIds(feed)
      const known = await options.store.knownReviewIds(ids)
      const fresh = ids.filter((id) => !known.has(id)).slice(0, limit)
      const report = await collect(options, fresh, deadline, gapMs, sleep)
      const cursor = await options.store.readCursor('backfill')
      if (cursor.cursor === null && ids.length > 0) {
        await options.store.writeCursor('backfill', {
          cursor: ids[0],
          done: false,
          seenDelta: 0,
          note: 'cursor from the public review feed',
        })
      }
      return { ok: !report.blocked, mode: 'sample', ...report, cursor: ids[0] ?? null }
    } finally {
      await options.store.unlock('sample')
    }
  } catch (error) {
    return { ok: false, mode: 'sample', ...EMPTY, error: messageOf(error) }
  }
}

export async function runBackfill(options: JobOptions): Promise<JobReport> {
  const now = options.now ?? new Date()
  const limit = options.limit ?? 20
  const budgetMs = options.budgetMs ?? 240_000
  const gapMs = options.gapMs ?? 1100
  const oldStreakLimit = options.oldStreakLimit ?? 12
  const sleep = options.sleep ?? delay
  const cutoff = appearanceCutoff(now).getTime()
  const deadline = Date.now() + budgetMs
  try {
    await options.store.ensure()
    const locked = await options.store.tryLock('backfill', Math.ceil(budgetMs / 1000) + 30)
    if (!locked) return { ok: true, mode: 'backfill', skipped: 'locked', ...EMPTY }
    try {
      let cursor = await options.store.readCursor('backfill')
      if (cursor.done) {
        return { ok: true, mode: 'backfill', done: true, cursor: cursor.cursor, ...EMPTY }
      }
      if (cursor.cursor === null) {
        const feed = await options.fetchText(feedUrl())
        if (isChallenge(feed)) return { ok: false, mode: 'backfill', blocked: true, ...EMPTY }
        const ids = parseFeedIds(feed)
        if (ids.length === 0) return { ok: false, mode: 'backfill', ...EMPTY, error: 'no review ids on the feed' }
        cursor = { cursor: ids[0], done: false, seen: cursor.seen }
        await options.store.writeCursor('backfill', { cursor: ids[0], done: false, seenDelta: 0, note: 'backfill started' })
      }

      let id = cursor.cursor ?? 0
      let fetched = 0
      let saved = 0
      let missing = 0
      let oldStreak = 0
      let oldest: string | null = null
      let done = false
      while (id > 0 && saved + missing < limit && Date.now() < deadline) {
        const stamp = await options.store.reviewStamp(id)
        if (stamp) {
          if (stamp.writtenAt && Date.parse(stamp.writtenAt) < cutoff) oldStreak += 1
          else oldStreak = 0
          if (stamp.writtenAt && (!oldest || stamp.writtenAt < oldest)) oldest = stamp.writtenAt
        } else {
          if (fetched > 0 || missing > 0) await sleep(gapMs)
          const html = await options.fetchText(reviewPageUrl(id))
          fetched += 1
          if (isChallenge(html)) {
            await options.store.writeCursor('backfill', {
              cursor: id,
              done: false,
              seenDelta: saved,
              oldest,
              note: 'stopped on a cloudflare challenge',
            })
            return { ok: false, mode: 'backfill', blocked: true, fetched, saved, missing, cursor: id, done: false }
          }
          const parsed = parseReviewPage(html, id)
          if (!parsed) {
            missing += 1
          } else {
            const book = await bookForReview(options, parsed.bookId, gapMs, sleep)
            if (book.blocked) {
              await options.store.writeCursor('backfill', {
                cursor: id,
                done: false,
                seenDelta: saved,
                oldest,
                note: 'stopped on a cloudflare challenge',
              })
              return { ok: false, mode: 'backfill', blocked: true, fetched, saved, missing, cursor: id, done: false }
            }
            await options.store.upsert(parsed, book.meta)
            saved += 1
            if (parsed.writtenAt && Date.parse(parsed.writtenAt) < cutoff) oldStreak += 1
            else oldStreak = 0
            if (parsed.writtenAt && (!oldest || parsed.writtenAt < oldest)) oldest = parsed.writtenAt
          }
        }
        if (oldStreak >= oldStreakLimit) {
          done = true
          id -= 1
          break
        }
        id -= 1
      }
      await options.store.writeCursor('backfill', {
        cursor: id,
        done,
        seenDelta: saved,
        oldest,
        note: done ? 'reached reviews older than two years' : 'batch finished',
      })
      return { ok: true, mode: 'backfill', fetched, saved, missing, cursor: id, done }
    } finally {
      await options.store.unlock('backfill')
    }
  } catch (error) {
    return { ok: false, mode: 'backfill', ...EMPTY, error: messageOf(error) }
  }
}

async function collect(
  options: JobOptions,
  ids: number[],
  deadline: number,
  gapMs: number,
  sleep: (ms: number) => Promise<void>,
): Promise<{ blocked?: boolean; fetched: number; saved: number; missing: number }> {
  let fetched = 0
  let saved = 0
  let missing = 0
  for (const id of ids) {
    if (Date.now() >= deadline) break
    if (fetched > 0) await sleep(gapMs)
    const html = await options.fetchText(reviewPageUrl(id))
    fetched += 1
    if (isChallenge(html)) return { blocked: true, fetched, saved, missing }
    const parsed = parseReviewPage(html, id)
    if (!parsed) {
      missing += 1
      continue
    }
    const book = await bookForReview(options, parsed.bookId, gapMs, sleep)
    if (book.blocked) return { blocked: true, fetched, saved, missing }
    await options.store.upsert(parsed, book.meta)
    saved += 1
  }
  return { fetched, saved, missing }
}

export async function runBookPages(options: JobOptions): Promise<JobReport> {
  const limit = options.limit ?? 40
  const budgetMs = options.budgetMs ?? 240_000
  const gapMs = options.gapMs ?? 1100
  const sleep = options.sleep ?? delay
  const deadline = Date.now() + budgetMs
  try {
    await options.store.ensure()
    const locked = await options.store.tryLock('books', Math.ceil(budgetMs / 1000) + 30)
    if (!locked) return { ok: true, mode: 'books', skipped: 'locked', ...EMPTY }
    try {
      const ids = await options.store.pendingBookIds()
      let fetched = 0
      let saved = 0
      let missing = 0
      for (const id of ids) {
        if (saved + missing >= limit || Date.now() >= deadline) break
        if (fetched > 0) await sleep(gapMs)
        const html = await options.fetchText(bookPageUrl(id))
        fetched += 1
        if (isChallenge(html)) return { ok: false, mode: 'books', blocked: true, fetched, saved, missing }
        const meta = parseBookPage(html, id)
        await options.store.saveBookMeta(id, meta ?? emptyBookMeta())
        if (meta) saved += 1
        else missing += 1
      }
      return { ok: true, mode: 'books', fetched, saved, missing, done: saved + missing >= ids.length }
    } finally {
      await options.store.unlock('books')
    }
  } catch (error) {
    return { ok: false, mode: 'books', ...EMPTY, error: messageOf(error) }
  }
}

async function bookForReview(
  options: JobOptions,
  bookId: number,
  gapMs: number,
  sleep: (ms: number) => Promise<void>,
): Promise<{ blocked: true } | { blocked: false; meta: BookMeta }> {
  const known = await options.store.bookMeta(bookId)
  if (known) return { blocked: false, meta: known }
  await sleep(gapMs)
  const html = await options.fetchText(bookPageUrl(bookId))
  if (isChallenge(html)) return { blocked: true }
  return { blocked: false, meta: parseBookPage(html, bookId) ?? emptyBookMeta() }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error'
}
