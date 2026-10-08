import type { BookMeta, ParsedReview } from './parse'

export interface StoredReview extends ParsedReview {}

export interface CrawlCursor {
  cursor: number | null
  done: boolean
  seen: number
}

export interface CatalogBook {
  id: number
  title: string
  author: string | null
  translator: string | null
  publisher: string | null
  publishedYear: number | null
  category: string | null
  subcategory: string | null
  coverUrl: string | null
  url: string
  reviewCount: number
  avgRating: number | null
  latestReviewAt: string | null
  excerpt: string | null
  reviewUrl: string | null
}

export interface CatalogPage {
  books: CatalogBook[]
  total: number
  modern: boolean
  modernSinceYear: number
  counts: { books: number; reviews: number }
  backfill: { cursor: number | null; done: boolean; seen: number; note: string | null }
}

export interface CatalogStore {
  ensure(): Promise<void>
  knownReviewIds(ids: number[]): Promise<Set<number>>
  reviewStamp(id: number): Promise<{ writtenAt: string | null } | null>
  bookMeta(bookId: number): Promise<BookMeta | null>
  saveBookMeta(bookId: number, meta: BookMeta): Promise<void>
  pendingBookIds(): Promise<number[]>
  upsert(review: StoredReview, book?: BookMeta | null): Promise<void>
  tryLock(key: string, seconds: number): Promise<boolean>
  unlock(key: string): Promise<void>
  readCursor(key: string): Promise<CrawlCursor>
  writeCursor(
    key: string,
    patch: { cursor: number | null; done: boolean; seenDelta: number; note?: string | null; oldest?: string | null },
  ): Promise<void>
  listBooks(options: { modern: boolean; limit: number; offset: number; now: Date }): Promise<CatalogPage>
}
