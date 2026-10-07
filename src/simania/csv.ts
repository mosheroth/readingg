import { appendFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { bookPageUrl, excerpt, modernPublishedYear, reviewPageUrl } from './parse'
import type { CatalogBook, CatalogPage, CatalogStore, CrawlCursor, StoredReview } from './store'

export const CSV_COLUMNS = [
  'review_id',
  'written_at',
  'rating',
  'likes',
  'reviewer',
  'reviewer_id',
  'body',
  'book_id',
  'title',
  'author',
  'translator',
  'publisher',
  'published_year',
  'pages',
  'category',
  'subcategory',
  'cover_url',
  'book_url',
  'review_url',
] as const

export function csvStore(filePath: string): CatalogStore {
  const statePath = `${filePath}.state.json`
  const lockPath = `${filePath}.lock`
  const reviews = new Map<number, StoredReview>()
  let ready = false

  return {
    async ensure() {
      if (ready) return
      await mkdir(dirname(filePath), { recursive: true })
      let raw = ''
      try {
        raw = await readFile(filePath, 'utf8')
      } catch (error) {
        if (!isMissing(error)) throw error
      }
      if (!raw) {
        await writeFile(filePath, `\uFEFF${CSV_COLUMNS.join(',')}\n`, 'utf8')
      } else {
        const rows = parseCsv(raw.replace(/^\uFEFF/, ''))
        const header = rows[0] ?? []
        if (header.join(',') !== CSV_COLUMNS.join(',')) {
          throw new Error(`unexpected columns in ${filePath}`)
        }
        for (const row of rows.slice(1)) {
          if (!row.some((cell) => cell.trim())) continue
          const review = reviewFromRow(row)
          reviews.set(review.reviewId, review)
        }
      }
      ready = true
    },
    async knownReviewIds(ids) {
      return new Set(ids.filter((id) => reviews.has(id)))
    },
    async reviewStamp(id) {
      const row = reviews.get(id)
      return row ? { writtenAt: row.writtenAt } : null
    },
    async upsert(review) {
      if (reviews.has(review.reviewId)) {
        reviews.set(review.reviewId, review)
        return
      }
      reviews.set(review.reviewId, review)
      await appendFile(filePath, `${toCsvRow(review)}\n`, 'utf8')
    },
    async tryLock(_key, seconds) {
      try {
        const existing = JSON.parse(await readFile(lockPath, 'utf8')) as { until?: number }
        if ((existing.until ?? 0) > Date.now()) return false
      } catch (error) {
        if (!isMissing(error)) throw error
      }
      await writeFile(lockPath, JSON.stringify({ until: Date.now() + seconds * 1000 }), 'utf8')
      return true
    },
    async unlock() {
      await writeFile(lockPath, JSON.stringify({ until: 0 }), 'utf8')
    },
    async readCursor() {
      return readState(statePath)
    },
    async writeCursor(_key, patch) {
      const current = await readState(statePath)
      await writeJson(statePath, {
        cursor: patch.cursor,
        done: patch.done,
        seen: current.seen + patch.seenDelta,
        note: patch.note ?? null,
        oldest: patch.oldest ?? null,
      })
    },
    async listBooks(options) {
      return pageFromReviews([...reviews.values()], options)
    },
  }
}

export function toCsvRow(review: StoredReview): string {
  const values = [
    review.reviewId,
    review.writtenAt,
    review.rating,
    review.likes,
    review.reviewer,
    review.reviewerId,
    review.body,
    review.bookId,
    review.title,
    review.author,
    review.translator,
    review.publisher,
    review.publishedYear,
    review.pages,
    review.category,
    review.subcategory,
    review.coverUrl,
    bookPageUrl(review.bookId),
    reviewPageUrl(review.reviewId),
  ]
  return values.map(csvField).join(',')
}

export function csvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const text = String(value)
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`
  return text
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"'
          index += 1
        } else quoted = false
      } else field += char
      continue
    }
    if (char === '"') quoted = true
    else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (char !== '\r') field += char
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

function reviewFromRow(row: string[]): StoredReview {
  const cell = (index: number) => row[index] ?? ''
  return {
    reviewId: Number(cell(0)),
    writtenAt: cell(1) || null,
    rating: numberOrNull(cell(2)),
    likes: numberOrNull(cell(3)),
    reviewer: cell(4) || null,
    reviewerId: numberOrNull(cell(5)),
    body: cell(6),
    bookId: Number(cell(7)),
    title: cell(8),
    author: cell(9) || null,
    translator: cell(10) || null,
    publisher: cell(11) || null,
    publishedYear: numberOrNull(cell(12)),
    pages: numberOrNull(cell(13)),
    category: cell(14) || null,
    subcategory: cell(15) || null,
    coverUrl: cell(16) || null,
  }
}

function numberOrNull(value: string): number | null {
  if (!value) return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

async function readState(statePath: string): Promise<CrawlCursor> {
  try {
    const parsed = JSON.parse(await readFile(statePath, 'utf8')) as { cursor?: number | null; done?: boolean; seen?: number }
    return { cursor: parsed.cursor ?? null, done: parsed.done ?? false, seen: parsed.seen ?? 0 }
  } catch (error) {
    if (isMissing(error)) return { cursor: null, done: false, seen: 0 }
    throw error
  }
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  const temporary = `${filePath}.tmp`
  await writeFile(temporary, `${JSON.stringify(value)}\n`, 'utf8')
  await rename(temporary, filePath)
}

function pageFromReviews(
  reviews: StoredReview[],
  options: { modern: boolean; limit: number; offset: number; now: Date },
): CatalogPage {
  const year = modernPublishedYear(options.now)
  const cutoff = new Date(options.now)
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 2)
  const byBook = new Map<number, StoredReview[]>()
  for (const review of reviews) {
    if (!review.writtenAt || Date.parse(review.writtenAt) < cutoff.getTime()) continue
    const list = byBook.get(review.bookId) ?? []
    list.push(review)
    byBook.set(review.bookId, list)
  }
  const books: CatalogBook[] = []
  for (const list of byBook.values()) {
    const latest = [...list].sort((a, b) => Date.parse(b.writtenAt ?? '') - Date.parse(a.writtenAt ?? ''))[0]
    if (options.modern && latest.publishedYear !== null && latest.publishedYear < year) continue
    const ratings = list.map((item) => item.rating).filter((rating): rating is number => rating !== null)
    books.push({
      id: latest.bookId,
      title: latest.title,
      author: latest.author,
      translator: latest.translator,
      publisher: latest.publisher,
      publishedYear: latest.publishedYear,
      category: latest.category,
      subcategory: latest.subcategory,
      coverUrl: latest.coverUrl,
      url: bookPageUrl(latest.bookId),
      reviewCount: list.length,
      avgRating: ratings.length ? Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 10) / 10 : null,
      latestReviewAt: latest.writtenAt,
      excerpt: excerpt(latest.body),
      reviewUrl: reviewPageUrl(latest.reviewId),
    })
  }
  books.sort((a, b) => Date.parse(b.latestReviewAt ?? '') - Date.parse(a.latestReviewAt ?? ''))
  return {
    books: books.slice(options.offset, options.offset + options.limit),
    total: books.length,
    modern: options.modern,
    modernSinceYear: year,
    counts: { books: byBook.size, reviews: reviews.length },
    backfill: { cursor: null, done: false, seen: reviews.length, note: null },
  }
}

function isMissing(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'
}
