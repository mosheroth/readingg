import { appendFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { bookPageUrl, excerpt, modernPublishedYear, reviewPageUrl, type BookMeta } from './parse'
import type { CatalogBook, CatalogPage, CatalogStore, CrawlCursor, StoredReview } from './store'

export const REVIEW_COLUMNS = [
  'review_id',
  'written_at',
  'rating',
  'likes',
  'reviewer',
  'reviewer_id',
  'body',
  'book_id',
  'review_url',
] as const

export const BOOK_COLUMNS = [
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
  'description',
  'subtitle',
  'english_title',
  'second_author',
  'editor',
  'isbn',
  'danacode',
  'series',
  'series_number',
  'language',
  'format',
  'avg_rating',
  'rating_count',
  'simania_review_count',
  'view_count',
  'owners_count',
  'currently_reading',
  'book_fetched',
] as const

const WIDE_COLUMNS = [
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
  'description',
  'subtitle',
  'english_title',
  'second_author',
  'editor',
  'isbn',
  'danacode',
  'series',
  'series_number',
  'language',
  'format',
  'avg_rating',
  'rating_count',
  'simania_review_count',
  'view_count',
  'owners_count',
  'currently_reading',
  'book_fetched',
] as const

const LEGACY_COLUMNS = WIDE_COLUMNS.slice(0, 19)

interface CsvBook extends BookMeta {
  bookId: number
  title: string
  author: string | null
  translator: string | null
  publisher: string | null
  publishedYear: number | null
  pages: number | null
  category: string | null
  subcategory: string | null
  coverUrl: string | null
}

export function booksFileFor(reviewsFile: string): string {
  if (reviewsFile.endsWith('reviews.csv')) return reviewsFile.replace(/reviews\.csv$/, 'books.csv')
  return reviewsFile.replace(/\.csv$/, '.books.csv')
}

export function csvStore(filePath: string): CatalogStore {
  const booksPath = booksFileFor(filePath)
  const statePath = `${filePath}.state.json`
  const lockPath = `${filePath}.lock`
  const reviews = new Map<number, StoredReview>()
  const books = new Map<number, CsvBook>()
  let ready = false

  async function writeBooks(): Promise<void> {
    const lines = [`\uFEFF${BOOK_COLUMNS.join(',')}`]
    for (const book of books.values()) lines.push(toBookRow(book))
    await atomicWrite(booksPath, `${lines.join('\n')}\n`)
  }

  async function writeReviews(): Promise<void> {
    const lines = [`\uFEFF${REVIEW_COLUMNS.join(',')}`]
    for (const review of reviews.values()) lines.push(toReviewRow(review))
    await atomicWrite(filePath, `${lines.join('\n')}\n`)
  }

  function paint(book: CsvBook) {
    for (const review of reviews.values()) {
      if (review.bookId !== book.bookId) continue
      review.title = book.title
      review.author = book.author
      review.translator = book.translator
      review.publisher = book.publisher
      review.publishedYear = book.publishedYear
      review.pages = book.pages
      review.category = book.category
      review.subcategory = book.subcategory
      review.coverUrl = book.coverUrl
    }
  }

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
        await atomicWrite(filePath, `\uFEFF${REVIEW_COLUMNS.join(',')}\n`)
        await atomicWrite(booksPath, `\uFEFF${BOOK_COLUMNS.join(',')}\n`)
        ready = true
        return
      }
      const rows = parseCsv(raw.replace(/^\uFEFF/, ''))
      const header = (rows[0] ?? []).join(',')
      if (header === REVIEW_COLUMNS.join(',')) {
        await loadSplit(rows)
      } else if (header === WIDE_COLUMNS.join(',') || header === LEGACY_COLUMNS.join(',')) {
        loadWide(rows)
        await writeBooks()
        await writeReviews()
      } else {
        throw new Error(`unexpected columns in ${filePath}`)
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
    async bookMeta(bookId) {
      const book = books.get(bookId)
      if (!book?.bookFetched) return null
      return metaOf(book)
    },
    async saveBookMeta(bookId, meta) {
      const next = mergeMeta(books.get(bookId), bookId, meta)
      const created = !books.has(bookId)
      books.set(bookId, next)
      paint(next)
      if (created) await appendFile(booksPath, `${toBookRow(next)}\n`, 'utf8')
      else await writeBooks()
    },
    async pendingBookIds() {
      const pending = new Set<number>()
      for (const review of reviews.values()) {
        if (!books.get(review.bookId)?.bookFetched) pending.add(review.bookId)
      }
      return [...pending].sort((a, b) => b - a)
    },
    async upsert(review, book) {
      const previous = books.get(review.bookId)
      const next = mergeReview(previous, review, book ?? null)
      const created = !previous
      books.set(review.bookId, next)
      const isNew = !reviews.has(review.reviewId)
      reviews.set(review.reviewId, review)
      paint(next)
      if (isNew) await appendFile(filePath, `${toReviewRow(review)}\n`, 'utf8')
      if (created) await appendFile(booksPath, `${toBookRow(next)}\n`, 'utf8')
      else if (bookSignature(previous) !== bookSignature(next)) await writeBooks()
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

  async function loadSplit(rows: string[][]) {
    let booksRaw = ''
    try {
      booksRaw = await readFile(booksPath, 'utf8')
    } catch (error) {
      if (!isMissing(error)) throw error
    }
    if (booksRaw) {
      const bookRows = parseCsv(booksRaw.replace(/^\uFEFF/, ''))
      const header = (bookRows[0] ?? []).join(',')
      if (header !== BOOK_COLUMNS.join(',')) throw new Error(`unexpected columns in ${booksPath}`)
      let dirty = false
      for (const row of bookRows.slice(1)) {
        if (!row.some((cell) => cell.trim())) continue
        if (row[16] === '0' || row[17] === '0' || row[19] === '0') dirty = true
        const book = bookFromRow(row)
        books.set(book.bookId, book)
      }
      if (dirty) await writeBooks()
    }
    for (const row of rows.slice(1)) {
      if (!row.some((cell) => cell.trim())) continue
      const review = reviewFromSplit(row)
      const book = books.get(review.bookId)
      if (book) applyBook(review, book)
      reviews.set(review.reviewId, review)
    }
  }

  function loadWide(rows: string[][]) {
    for (const row of rows.slice(1)) {
      if (!row.some((cell) => cell.trim())) continue
      const review = reviewFromWide(row)
      const fetched = row[36] === '1'
      const incoming = bookFromWide(review, fetched ? metaFromWide(row) : null)
      books.set(review.bookId, absorb(books.get(review.bookId), incoming))
      applyBook(review, books.get(review.bookId)!)
      reviews.set(review.reviewId, review)
    }
  }
}

export function toReviewRow(review: StoredReview): string {
  return [
    review.reviewId,
    review.writtenAt,
    review.rating,
    review.likes,
    review.reviewer,
    review.reviewerId,
    review.body,
    review.bookId,
    reviewPageUrl(review.reviewId),
  ]
    .map(csvField)
    .join(',')
}

export function toBookRow(book: CsvBook): string {
  return [
    book.bookId,
    book.title,
    book.author,
    book.translator,
    book.publisher,
    book.publishedYear,
    book.pages,
    book.category,
    book.subcategory,
    book.coverUrl,
    bookPageUrl(book.bookId),
    book.description,
    book.subtitle,
    book.englishTitle,
    book.secondAuthor,
    book.editor,
    book.isbn,
    book.danacode,
    book.series,
    book.seriesNumber,
    book.language,
    book.format,
    book.avgRating,
    book.ratingCount,
    book.simaniaReviewCount,
    book.viewCount,
    book.ownersCount,
    book.currentlyReading,
    book.bookFetched ? 1 : '',
  ]
    .map(csvField)
    .join(',')
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

function reviewFromSplit(row: string[]): StoredReview {
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
    title: '',
    author: null,
    translator: null,
    publisher: null,
    publishedYear: null,
    pages: null,
    category: null,
    subcategory: null,
    coverUrl: null,
  }
}

function reviewFromWide(row: string[]): StoredReview {
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

function metaFromWide(row: string[]): BookMeta {
  const cell = (index: number) => row[index] ?? ''
  return {
    description: cell(19) || null,
    subtitle: cell(20) || null,
    englishTitle: cell(21) || null,
    secondAuthor: cell(22) || null,
    editor: cell(23) || null,
    isbn: blankCode(cell(24)),
    danacode: blankCode(cell(25)),
    series: cell(26) || null,
    seriesNumber: blankCode(cell(27)),
    language: cell(28) || null,
    format: cell(29) || null,
    avgRating: numberOrNull(cell(30)),
    ratingCount: numberOrNull(cell(31)),
    simaniaReviewCount: numberOrNull(cell(32)),
    viewCount: numberOrNull(cell(33)),
    ownersCount: numberOrNull(cell(34)),
    currentlyReading: numberOrNull(cell(35)),
    bookFetched: true,
  }
}

function bookFromRow(row: string[]): CsvBook {
  const cell = (index: number) => row[index] ?? ''
  return {
    bookId: Number(cell(0)),
    title: cell(1),
    author: cell(2) || null,
    translator: cell(3) || null,
    publisher: cell(4) || null,
    publishedYear: numberOrNull(cell(5)),
    pages: numberOrNull(cell(6)),
    category: cell(7) || null,
    subcategory: cell(8) || null,
    coverUrl: cell(9) || null,
    description: cell(11) || null,
    subtitle: cell(12) || null,
    englishTitle: cell(13) || null,
    secondAuthor: cell(14) || null,
    editor: cell(15) || null,
    isbn: blankCode(cell(16)),
    danacode: blankCode(cell(17)),
    series: cell(18) || null,
    seriesNumber: blankCode(cell(19)),
    language: cell(20) || null,
    format: cell(21) || null,
    avgRating: numberOrNull(cell(22)),
    ratingCount: numberOrNull(cell(23)),
    simaniaReviewCount: numberOrNull(cell(24)),
    viewCount: numberOrNull(cell(25)),
    ownersCount: numberOrNull(cell(26)),
    currentlyReading: numberOrNull(cell(27)),
    bookFetched: cell(28) === '1',
  }
}

function bookFromWide(review: StoredReview, meta: BookMeta | null): CsvBook {
  return {
    bookId: review.bookId,
    title: review.title,
    author: review.author,
    translator: review.translator,
    publisher: review.publisher,
    publishedYear: review.publishedYear,
    pages: review.pages,
    category: review.category,
    subcategory: review.subcategory,
    coverUrl: review.coverUrl,
    description: meta?.description ?? null,
    subtitle: meta?.subtitle ?? null,
    englishTitle: meta?.englishTitle ?? null,
    secondAuthor: meta?.secondAuthor ?? null,
    editor: meta?.editor ?? null,
    isbn: meta?.isbn ?? null,
    danacode: meta?.danacode ?? null,
    series: meta?.series ?? null,
    seriesNumber: meta?.seriesNumber ?? null,
    language: meta?.language ?? null,
    format: meta?.format ?? null,
    avgRating: meta?.avgRating ?? null,
    ratingCount: meta?.ratingCount ?? null,
    simaniaReviewCount: meta?.simaniaReviewCount ?? null,
    viewCount: meta?.viewCount ?? null,
    ownersCount: meta?.ownersCount ?? null,
    currentlyReading: meta?.currentlyReading ?? null,
    bookFetched: meta?.bookFetched ?? false,
  }
}

function absorb(current: CsvBook | undefined, incoming: CsvBook): CsvBook {
  if (!current) return incoming
  const meta = current.bookFetched ? current : incoming
  return {
    bookId: current.bookId,
    title: current.title || incoming.title,
    author: current.author ?? incoming.author,
    translator: current.translator ?? incoming.translator,
    publisher: current.publisher ?? incoming.publisher,
    publishedYear: current.publishedYear ?? incoming.publishedYear,
    pages: current.pages ?? incoming.pages,
    category: current.category ?? incoming.category,
    subcategory: current.subcategory ?? incoming.subcategory,
    coverUrl: current.coverUrl ?? incoming.coverUrl,
    description: meta.description,
    subtitle: meta.subtitle,
    englishTitle: meta.englishTitle,
    secondAuthor: meta.secondAuthor,
    editor: meta.editor,
    isbn: meta.isbn,
    danacode: meta.danacode,
    series: meta.series,
    seriesNumber: meta.seriesNumber,
    language: meta.language,
    format: meta.format,
    avgRating: meta.avgRating,
    ratingCount: meta.ratingCount,
    simaniaReviewCount: meta.simaniaReviewCount,
    viewCount: meta.viewCount,
    ownersCount: meta.ownersCount,
    currentlyReading: meta.currentlyReading,
    bookFetched: current.bookFetched || incoming.bookFetched,
  }
}

function mergeReview(current: CsvBook | undefined, review: StoredReview, meta: BookMeta | null): CsvBook {
  const base = current ?? bookFromWide(review, null)
  const next = absorb(base, bookFromWide(review, null))
  if (current) {
    next.title = current.title || review.title
    next.author = current.author ?? review.author
    next.translator = current.translator ?? review.translator
    next.publisher = current.publisher ?? review.publisher
    next.publishedYear = current.publishedYear ?? review.publishedYear
    next.pages = current.pages ?? review.pages
    next.category = current.category ?? review.category
    next.subcategory = current.subcategory ?? review.subcategory
    next.coverUrl = current.coverUrl ?? review.coverUrl
  }
  if (meta?.bookFetched) return mergeMeta(next, review.bookId, meta)
  return next
}

function mergeMeta(current: CsvBook | undefined, bookId: number, meta: BookMeta): CsvBook {
  const base = current ?? bookFromWide(blankReview(bookId), null)
  return {
    ...base,
    description: meta.description,
    subtitle: meta.subtitle,
    englishTitle: meta.englishTitle,
    secondAuthor: meta.secondAuthor,
    editor: meta.editor,
    isbn: meta.isbn,
    danacode: meta.danacode,
    series: meta.series,
    seriesNumber: meta.seriesNumber,
    language: meta.language,
    format: meta.format,
    avgRating: meta.avgRating,
    ratingCount: meta.ratingCount,
    simaniaReviewCount: meta.simaniaReviewCount,
    viewCount: meta.viewCount,
    ownersCount: meta.ownersCount,
    currentlyReading: meta.currentlyReading,
    bookFetched: true,
  }
}

function blankReview(bookId: number): StoredReview {
  return {
    reviewId: 0,
    bookId,
    title: '',
    author: null,
    translator: null,
    publisher: null,
    publishedYear: null,
    pages: null,
    category: null,
    subcategory: null,
    coverUrl: null,
    reviewer: null,
    reviewerId: null,
    rating: null,
    body: '',
    writtenAt: null,
    likes: null,
  }
}

function applyBook(review: StoredReview, book: CsvBook) {
  review.title = book.title
  review.author = book.author
  review.translator = book.translator
  review.publisher = book.publisher
  review.publishedYear = book.publishedYear
  review.pages = book.pages
  review.category = book.category
  review.subcategory = book.subcategory
  review.coverUrl = book.coverUrl
}

function metaOf(book: CsvBook): BookMeta {
  return {
    description: book.description,
    subtitle: book.subtitle,
    englishTitle: book.englishTitle,
    secondAuthor: book.secondAuthor,
    editor: book.editor,
    isbn: book.isbn,
    danacode: book.danacode,
    series: book.series,
    seriesNumber: book.seriesNumber,
    language: book.language,
    format: book.format,
    avgRating: book.avgRating,
    ratingCount: book.ratingCount,
    simaniaReviewCount: book.simaniaReviewCount,
    viewCount: book.viewCount,
    ownersCount: book.ownersCount,
    currentlyReading: book.currentlyReading,
    bookFetched: true,
  }
}

function bookSignature(book: CsvBook | undefined): string {
  return JSON.stringify(book ?? null)
}

function blankCode(value: string): string | null {
  if (!value || value === '0') return null
  return value
}

function numberOrNull(value: string): number | null {
  if (!value) return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

async function atomicWrite(filePath: string, contents: string): Promise<void> {
  const temporary = `${filePath}.tmp`
  await writeFile(temporary, contents, 'utf8')
  await rename(temporary, filePath)
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
  await atomicWrite(filePath, `${JSON.stringify(value)}\n`)
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
