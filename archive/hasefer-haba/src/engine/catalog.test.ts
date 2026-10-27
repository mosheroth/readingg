import { describe, expect, it } from 'vitest'
import { sliceCatalog, type CatalogEntry } from './catalog'

function entry(patch: Partial<CatalogEntry> & Pick<CatalogEntry, 'id' | 'title'>): CatalogEntry {
  return {
    author: '',
    translator: '',
    publisher: '',
    publishedYear: null,
    category: '',
    subcategory: '',
    coverUrl: '',
    url: 'https://simania.co.il/bookdetails.php?item_id=' + patch.id,
    reviewCount: 1,
    avgRating: null,
    excerpt: '',
    reviewUrl: '',
    ...patch,
  }
}

const books = [
  entry({ id: '1', title: 'ישן', publishedYear: 1990 }),
  entry({ id: '2', title: 'חדש', publishedYear: 2026 }),
  entry({ id: '3', title: 'בלי שנה', publishedYear: null }),
]

describe('sliceCatalog', () => {
  const now = new Date('2026-10-08T00:00:00Z')

  it('keeps recent books and books without a year', () => {
    const page = sliceCatalog(books, 9, { modern: true, offset: 0, limit: 24, now })
    expect(page.modernSinceYear).toBe(2024)
    expect(page.books.map((book) => book.id)).toEqual(['2', '3'])
    expect(page.total).toBe(2)
    expect(page.counts).toEqual({ books: 3, reviews: 9 })
  })

  it('pages the full list without repeating a book', () => {
    const first = sliceCatalog(books, 9, { modern: false, offset: 0, limit: 1, now })
    const second = sliceCatalog(books, 9, { modern: false, offset: 1, limit: 1, now })
    expect(first.total).toBe(3)
    expect(first.books).toHaveLength(1)
    expect(second.books[0]?.id).not.toBe(first.books[0]?.id)
  })
})
