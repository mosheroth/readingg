import { modernPublishedYear } from '../simania/parse'

export interface CatalogEntry {
  id: string
  title: string
  author: string
  translator: string
  publisher: string
  publishedYear: number | null
  category: string
  subcategory: string
  coverUrl: string
  url: string
  reviewCount: number
  avgRating: number | null
  excerpt: string
  reviewUrl: string
}

export interface CatalogSlice {
  books: CatalogEntry[]
  total: number
  modernSinceYear: number
  counts: { books: number; reviews: number }
}

function byRecent(a: CatalogEntry, b: CatalogEntry): number {
  const yearA = a.publishedYear ?? -1
  const yearB = b.publishedYear ?? -1
  return yearB - yearA || a.title.localeCompare(b.title, 'he') || a.id.localeCompare(b.id)
}

function byTitle(a: CatalogEntry, b: CatalogEntry): number {
  return a.title.localeCompare(b.title, 'he') || a.id.localeCompare(b.id)
}

export function sliceCatalog(
  books: readonly CatalogEntry[],
  reviewTotal: number,
  options: { modern: boolean; offset: number; limit: number; now: Date },
): CatalogSlice {
  const year = modernPublishedYear(options.now)
  const filtered = options.modern
    ? books.filter((book) => book.publishedYear === null || book.publishedYear >= year)
    : [...books]
  filtered.sort(options.modern ? byRecent : byTitle)
  return {
    books: filtered.slice(options.offset, options.offset + options.limit),
    total: filtered.length,
    modernSinceYear: year,
    counts: { books: books.length, reviews: reviewTotal },
  }
}
