import { describe, expect, it } from 'vitest'
import { runBackfill, runSample } from './jobs'
import type { CatalogPage, CatalogStore, CrawlCursor, StoredReview } from './store'

function page(reviewId: number, date: string, title = `ספר ${reviewId}`): string {
  const flight = JSON.stringify({
    review: {
      id: reviewId,
      bookId: 5000 + reviewId,
      userId: 7,
      content: `ביקורת מלאה על ${title}. היא ארוכה מספיק כדי להישמר במאגר.`,
      rating: 4,
      date,
      likesCount: 2,
      reviewer: { id: 7, name: 'קורא' },
    },
    book: {
      id: 5000 + reviewId,
      title,
      author: 'סופר',
      translator: '',
      publisher: 'הוצאה',
      year: 2025,
      pages: 120,
      category: 'ספרות',
      subCategory: 'ספרות מקורית',
      imageUrl: 'https://cdn.simania.co.il/cover.jpg',
    },
  })
  return `<title>ביקורת</title><script>self.__next_f.push([1,${JSON.stringify(flight)}])</script>`
}

function memoryStore() {
  const reviews = new Map<number, StoredReview>()
  const locks = new Map<string, number>()
  const cursors = new Map<string, CrawlCursor>()
  const store: CatalogStore = {
    async ensure() {},
    async knownReviewIds(ids) {
      return new Set(ids.filter((id) => reviews.has(id)))
    },
    async reviewStamp(id) {
      const row = reviews.get(id)
      return row ? { writtenAt: row.writtenAt } : null
    },
    async bookMeta() {
      return null
    },
    async saveBookMeta() {},
    async pendingBookIds() {
      return []
    },
    async upsert(review) {
      reviews.set(review.reviewId, review)
    },
    async tryLock(key, seconds) {
      if ((locks.get(key) ?? 0) > Date.now()) return false
      locks.set(key, Date.now() + seconds * 1000)
      return true
    },
    async unlock(key) {
      locks.set(key, 0)
    },
    async readCursor(key) {
      return cursors.get(key) ?? { cursor: null, done: false, seen: 0 }
    },
    async writeCursor(key, patch) {
      const current = cursors.get(key) ?? { cursor: null, done: false, seen: 0 }
      cursors.set(key, { cursor: patch.cursor, done: patch.done, seen: current.seen + patch.seenDelta })
    },
    async listBooks(): Promise<CatalogPage> {
      throw new Error('unused')
    },
  }
  return { store, reviews, cursors }
}

describe('sample', () => {
  it('stores new reviews from the feed and remembers where a backfill should start', async () => {
    const { store, reviews, cursors } = memoryStore()
    const report = await runSample({
      store,
      gapMs: 0,
      now: new Date('2026-10-07T00:00:00Z'),
      fetchText: async (url) => {
        if (url.endsWith('reviews.php')) return '<a href="/showReview.php?reviewId=30"></a><a href="/showReview.php?reviewId=29"></a>'
        const id = Number(new URL(url).searchParams.get('reviewId'))
        return page(id, '2026-05-01T00:00:00.000Z')
      },
    })
    expect(report.ok).toBe(true)
    expect(report.saved).toBe(2)
    expect(report.blocked).toBeUndefined()
    expect(reviews.size).toBe(2)
    expect(cursors.get('backfill')?.cursor).toBe(30)
  })

  it('does not advance past a cloudflare challenge', async () => {
    const { store, reviews } = memoryStore()
    const report = await runSample({
      store,
      gapMs: 0,
      fetchText: async (url) => (url.endsWith('reviews.php') ? '<a href="/showReview.php?reviewId=8"></a>' : '<title>Just a moment...</title>'),
    })
    expect(report.blocked).toBe(true)
    expect(reviews.size).toBe(0)
  })
})

describe('backfill', () => {
  it('walks downward and stops after a run of reviews older than two years', async () => {
    const { store, reviews, cursors } = memoryStore()
    const dates: Record<number, string> = {
      30: '2026-05-01T00:00:00.000Z',
      29: '2020-01-01T00:00:00.000Z',
      28: '2019-01-01T00:00:00.000Z',
    }
    const report = await runBackfill({
      store,
      gapMs: 0,
      oldStreakLimit: 2,
      now: new Date('2026-10-07T00:00:00Z'),
      fetchText: async (url) => {
        if (url.endsWith('reviews.php')) return '<a href="/showReview.php?reviewId=30"></a>'
        const id = Number(new URL(url).searchParams.get('reviewId'))
        return dates[id] ? page(id, dates[id]) : '<title>חסר</title><script>self.__next_f.push([1,"{}"])</script>'
      },
    })
    expect(report).toMatchObject({ ok: true, saved: 3, done: true, cursor: 27 })
    expect([...reviews.keys()].sort()).toEqual([28, 29, 30])
    expect(cursors.get('backfill')?.done).toBe(true)
  })

  it('keeps the cursor on the review that was challenged', async () => {
    const { store, cursors } = memoryStore()
    const report = await runBackfill({
      store,
      gapMs: 0,
      fetchText: async (url) => (url.endsWith('reviews.php') ? '<a href="/showReview.php?reviewId=10"></a>' : '<title>Just a moment...</title>'),
    })
    expect(report.blocked).toBe(true)
    expect(cursors.get('backfill')?.cursor).toBe(10)
    expect(cursors.get('backfill')?.done).toBe(false)
  })

  it('keeps the review unstored when the book page is challenged', async () => {
    const { store, reviews, cursors } = memoryStore()
    const report = await runBackfill({
      store,
      gapMs: 0,
      fetchText: async (url) => {
        if (url.endsWith('reviews.php')) return '<a href="/showReview.php?reviewId=10"></a>'
        if (url.includes('bookdetails.php')) return '<title>Just a moment...</title>'
        return page(10, '2026-05-01T00:00:00.000Z')
      },
    })
    expect(report.blocked).toBe(true)
    expect(reviews.size).toBe(0)
    expect(cursors.get('backfill')?.cursor).toBe(10)
  })
})
