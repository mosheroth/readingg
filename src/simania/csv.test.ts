import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { csvStore, parseCsv, toCsvRow } from './csv'
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
  it('quotes commas, quotes, and line breaks', () => {
    const row = toCsvRow(sample)
    const parsed = parseCsv(`${row}\n`)
    expect(parsed[0][8]).toBe('ספר, עם פסיק')
    expect(parsed[0][6]).toBe('שורה ראשונה\nשורה עם "ציטוט"')
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
    const text = await readFile(file, 'utf8')
    expect(text.match(/10,/g)?.length).toBe(1)
  })
})
