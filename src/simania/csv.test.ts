import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BOOK_COLUMNS, REVIEW_COLUMNS, booksFileFor, csvStore, parseCsv, toReviewRow } from './csv'
import { emptyBookMeta } from './parse'
import type { StoredReview } from './store'

const sample: StoredReview = {
  reviewId: 10,
  bookId: 20,
  title: 'ספר, עם פסיק',
  author: 'סופר',
  translator: null,
  publisher: 'הוצאה',
  publishedYear: 2025,
  pages: 100,
  category: 'ספרות',
  subcategory: 'מקורית',
  coverUrl: 'https://cdn.simania.co.il/cover.jpg',
  reviewer: 'קורא',
  reviewerId: 3,
  rating: 4,
  body: 'שורה ראשונה\nשורה עם "ציטוט"',
  writtenAt: '2026-03-01T00:00:00.000Z',
  likes: 2,
}

describe('csv catalog', () => {
  it('quotes commas, quotes, and line breaks in the review row', () => {
    const row = toReviewRow(sample)
    const parsed = parseCsv(`${row}\n`)
    expect(parsed[0][6]).toBe('שורה ראשונה\nשורה עם "ציטוט"')
    expect(parsed[0][7]).toBe('20')
  })

  it('appends a review and continues from the saved cursor', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'simania-'))
    const file = join(dir, 'simania-reviews.csv')
    const store = csvStore(file)
    await store.ensure()
    await store.upsert(sample)
    await store.writeCursor('backfill', { cursor: 9, done: false, seenDelta: 1, note: 'batch finished' })

    const again = csvStore(file)
    await again.ensure()
    expect(await again.reviewStamp(10)).toEqual({ writtenAt: sample.writtenAt })
    expect((await again.readCursor('backfill')).cursor).toBe(9)
    await again.upsert(sample)
    const rows = parseCsv((await readFile(file, 'utf8')).replace(/^\uFEFF/, ''))
    expect(rows.filter((row) => row[0] === '10')).toHaveLength(1)
    const page = await again.listBooks({ modern: false, limit: 5, offset: 0, now: new Date('2026-10-07T00:00:00Z') })
    expect(page.books[0]?.title).toBe('ספר, עם פסיק')
  })

  it('stores the book once when several reviews point at it', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'simania-'))
    const file = join(dir, 'simania-reviews.csv')
    const store = csvStore(file)
    await store.ensure()
    await store.upsert(sample)
    await store.upsert({ ...sample, reviewId: 11, body: 'ביקורת שנייה' })
    const meta = { ...emptyBookMeta(), description: 'תקציר עם "ציטוט"', avgRating: 4.7, ratingCount: 3, viewCount: 12 }
    await store.saveBookMeta(sample.bookId, meta)

    const again = csvStore(file)
    await again.ensure()
    expect(await again.bookMeta(sample.bookId)).toMatchObject({ description: 'תקציר עם "ציטוט"', avgRating: 4.7, ratingCount: 3 })
    expect(await again.pendingBookIds()).toEqual([])

    const reviews = parseCsv((await readFile(file, 'utf8')).replace(/^\uFEFF/, ''))
    expect(reviews[0].join(',')).toBe(REVIEW_COLUMNS.join(','))
    expect(reviews).toHaveLength(3)
    expect(reviews[1][6]).toBe(sample.body)
    expect(reviews[2][6]).toBe('ביקורת שנייה')
    expect(reviews.some((row) => row.join(',').includes('תקציר'))).toBe(false)

    const books = parseCsv((await readFile(booksFileFor(file), 'utf8')).replace(/^\uFEFF/, ''))
    expect(books[0].join(',')).toBe(BOOK_COLUMNS.join(','))
    expect(books).toHaveLength(2)
    expect(books[1][1]).toBe('ספר, עם פסיק')
    expect(books[1][11]).toBe('תקציר עם "ציטוט"')
    expect(books[1][22]).toBe('4.7')
  })
})
