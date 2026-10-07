import postgres from 'postgres'
import { bookPageUrl, excerpt, modernPublishedYear, reviewPageUrl } from './parse'
import type { CatalogBook, CatalogPage, CatalogStore, CrawlCursor, StoredReview } from './store'

type Sql = ReturnType<typeof postgres>

let client: Sql | null = null
let ready: Promise<void> | null = null

export function databaseUrl(): string | null {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || null
}

export function getSql(): Sql {
  const url = databaseUrl()
  if (!url) throw new Error('DATABASE_URL is not set')
  if (!client) {
    const local = /@(localhost|127\.0\.0\.1)(:|\/)/.test(url)
    client = postgres(url, {
      max: 1,
      prepare: false,
      ssl: local ? false : 'require',
      idle_timeout: 5,
      connect_timeout: 15,
    })
  }
  return client
}

export async function closeDb(): Promise<void> {
  if (client) await client.end({ timeout: 5 })
  client = null
  ready = null
}

export function postgresStore(): CatalogStore {
  return {
    ensure: ensureSchema,
    knownReviewIds,
    reviewStamp,
    upsert,
    tryLock,
    unlock,
    readCursor,
    writeCursor,
    listBooks,
  }
}

export async function ensureSchema(): Promise<void> {
  if (!ready) {
    ready = createTables().catch((error: unknown) => {
      ready = null
      throw error
    })
  }
  await ready
}

async function createTables(): Promise<void> {
  const sql = getSql()
  await sql.unsafe(`CREATE TABLE IF NOT EXISTS books (
    simania_book_id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT,
    translator TEXT,
    publisher TEXT,
    published_year INTEGER,
    pages INTEGER,
    category TEXT,
    subcategory TEXT,
    cover_url TEXT,
    url TEXT NOT NULL,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`)
  await sql.unsafe(`CREATE TABLE IF NOT EXISTS reviews (
    simania_review_id INTEGER PRIMARY KEY,
    book_id INTEGER NOT NULL REFERENCES books(simania_book_id),
    reviewer TEXT,
    reviewer_id INTEGER,
    rating NUMERIC,
    body TEXT NOT NULL,
    written_at TIMESTAMPTZ,
    likes INTEGER,
    url TEXT NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`)
  await sql.unsafe(`CREATE INDEX IF NOT EXISTS reviews_written_at_idx ON reviews (written_at DESC)`)
  await sql.unsafe(`CREATE INDEX IF NOT EXISTS reviews_book_idx ON reviews (book_id)`)
  await sql.unsafe(`CREATE TABLE IF NOT EXISTS crawl_state (
    key TEXT PRIMARY KEY,
    cursor_id INTEGER,
    done BOOLEAN NOT NULL DEFAULT false,
    locked_until TIMESTAMPTZ,
    oldest_seen TIMESTAMPTZ,
    reviews_seen INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    note TEXT
  )`)
}

async function knownReviewIds(ids: number[]): Promise<Set<number>> {
  if (ids.length === 0) return new Set()
  const sql = getSql()
  const rows = await sql<{ simania_review_id: number }[]>`
    SELECT simania_review_id FROM reviews WHERE simania_review_id IN ${sql(ids)}
  `
  return new Set(rows.map((row) => row.simania_review_id))
}

async function reviewStamp(id: number): Promise<{ writtenAt: string | null } | null> {
  const sql = getSql()
  const rows = await sql<{ written_at: Date | null }[]>`
    SELECT written_at FROM reviews WHERE simania_review_id = ${id}
  `
  if (rows.length === 0) return null
  return { writtenAt: rows[0].written_at ? rows[0].written_at.toISOString() : null }
}

async function upsert(review: StoredReview): Promise<void> {
  const sql = getSql()
  await sql.begin(async (tx) => {
    await tx`
      INSERT INTO books (
        simania_book_id, title, author, translator, publisher, published_year, pages,
        category, subcategory, cover_url, url
      ) VALUES (
        ${review.bookId}, ${review.title}, ${review.author}, ${review.translator}, ${review.publisher},
        ${review.publishedYear}, ${review.pages}, ${review.category}, ${review.subcategory},
        ${review.coverUrl}, ${bookPageUrl(review.bookId)}
      )
      ON CONFLICT (simania_book_id) DO UPDATE SET
        title = EXCLUDED.title,
        author = COALESCE(EXCLUDED.author, books.author),
        translator = COALESCE(EXCLUDED.translator, books.translator),
        publisher = COALESCE(EXCLUDED.publisher, books.publisher),
        published_year = COALESCE(EXCLUDED.published_year, books.published_year),
        pages = COALESCE(EXCLUDED.pages, books.pages),
        category = COALESCE(EXCLUDED.category, books.category),
        subcategory = COALESCE(EXCLUDED.subcategory, books.subcategory),
        cover_url = COALESCE(EXCLUDED.cover_url, books.cover_url),
        updated_at = now()
    `
    await tx`
      INSERT INTO reviews (
        simania_review_id, book_id, reviewer, reviewer_id, rating, body, written_at, likes, url
      ) VALUES (
        ${review.reviewId}, ${review.bookId}, ${review.reviewer}, ${review.reviewerId}, ${review.rating},
        ${review.body}, ${review.writtenAt}, ${review.likes}, ${reviewPageUrl(review.reviewId)}
      )
      ON CONFLICT (simania_review_id) DO UPDATE SET
        reviewer = EXCLUDED.reviewer,
        reviewer_id = EXCLUDED.reviewer_id,
        rating = EXCLUDED.rating,
        body = EXCLUDED.body,
        written_at = EXCLUDED.written_at,
        likes = EXCLUDED.likes,
        fetched_at = now()
    `
  })
}

async function tryLock(key: string, seconds: number): Promise<boolean> {
  const sql = getSql()
  await sql`INSERT INTO crawl_state (key) VALUES (${key}) ON CONFLICT (key) DO NOTHING`
  const rows = await sql<{ key: string }[]>`
    UPDATE crawl_state
    SET locked_until = now() + make_interval(secs => ${seconds}), updated_at = now()
    WHERE key = ${key} AND (locked_until IS NULL OR locked_until < now())
    RETURNING key
  `
  return rows.length > 0
}

async function unlock(key: string): Promise<void> {
  const sql = getSql()
  await sql`UPDATE crawl_state SET locked_until = NULL, updated_at = now() WHERE key = ${key}`
}

async function readCursor(key: string): Promise<CrawlCursor> {
  const sql = getSql()
  const rows = await sql<{ cursor_id: number | null; done: boolean; reviews_seen: number }[]>`
    SELECT cursor_id, done, reviews_seen FROM crawl_state WHERE key = ${key}
  `
  if (rows.length === 0) return { cursor: null, done: false, seen: 0 }
  return { cursor: rows[0].cursor_id, done: rows[0].done, seen: rows[0].reviews_seen }
}

async function writeCursor(
  key: string,
  patch: { cursor: number | null; done: boolean; seenDelta: number; note?: string | null; oldest?: string | null },
): Promise<void> {
  const sql = getSql()
  await sql`
    INSERT INTO crawl_state (key, cursor_id, done, reviews_seen, note, oldest_seen)
    VALUES (${key}, ${patch.cursor}, ${patch.done}, ${patch.seenDelta}, ${patch.note ?? null}, ${patch.oldest ?? null})
    ON CONFLICT (key) DO UPDATE SET
      cursor_id = EXCLUDED.cursor_id,
      done = EXCLUDED.done,
      reviews_seen = crawl_state.reviews_seen + EXCLUDED.reviews_seen,
      note = COALESCE(EXCLUDED.note, crawl_state.note),
      oldest_seen = CASE
        WHEN crawl_state.oldest_seen IS NULL THEN EXCLUDED.oldest_seen
        WHEN EXCLUDED.oldest_seen IS NULL THEN crawl_state.oldest_seen
        ELSE LEAST(crawl_state.oldest_seen, EXCLUDED.oldest_seen)
      END,
      updated_at = now()
  `
}

async function listBooks(options: { modern: boolean; limit: number; offset: number; now: Date }): Promise<CatalogPage> {
  const sql = getSql()
  await ensureSchema()
  const year = modernPublishedYear(options.now)
  const rows = await sql<BookQuery[]>`
    SELECT
      b.simania_book_id AS id,
      b.title,
      b.author,
      b.translator,
      b.publisher,
      b.published_year,
      b.category,
      b.subcategory,
      b.cover_url,
      b.url,
      stats.review_count,
      stats.avg_rating,
      stats.latest_review_at,
      latest.body AS excerpt_source,
      latest.url AS review_url
    FROM books b
    JOIN LATERAL (
      SELECT COUNT(*)::int AS review_count,
             ROUND(AVG(rating)::numeric, 1) AS avg_rating,
             MAX(written_at) AS latest_review_at
      FROM reviews r
      WHERE r.book_id = b.simania_book_id
        AND r.written_at >= now() - interval '2 years'
    ) stats ON stats.review_count > 0
    JOIN LATERAL (
      SELECT LEFT(body, 400) AS body, url
      FROM reviews r
      WHERE r.book_id = b.simania_book_id
        AND r.written_at >= now() - interval '2 years'
      ORDER BY written_at DESC NULLS LAST
      LIMIT 1
    ) latest ON true
    WHERE (${options.modern} = false OR b.published_year IS NULL OR b.published_year >= ${year})
    ORDER BY stats.latest_review_at DESC NULLS LAST, b.simania_book_id DESC
    LIMIT ${options.limit} OFFSET ${options.offset}
  `
  const totals = await sql<{ total: number }[]>`
    SELECT COUNT(*)::int AS total FROM (
      SELECT b.simania_book_id
      FROM books b
      JOIN reviews r ON r.book_id = b.simania_book_id
      WHERE r.written_at >= now() - interval '2 years'
        AND (${options.modern} = false OR b.published_year IS NULL OR b.published_year >= ${year})
      GROUP BY b.simania_book_id
    ) matched
  `
  const counts = await sql<{ books: number; reviews: number }[]>`
    SELECT
      (SELECT COUNT(*)::int FROM books) AS books,
      (SELECT COUNT(*)::int FROM reviews) AS reviews
  `
  const backfill = await sql<{ cursor_id: number | null; done: boolean; reviews_seen: number; note: string | null }[]>`
    SELECT cursor_id, done, reviews_seen, note FROM crawl_state WHERE key = 'backfill'
  `
  const books: CatalogBook[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    author: row.author,
    translator: row.translator,
    publisher: row.publisher,
    publishedYear: row.published_year,
    category: row.category,
    subcategory: row.subcategory,
    coverUrl: row.cover_url,
    url: row.url,
    reviewCount: row.review_count,
    avgRating: row.avg_rating === null ? null : Number(row.avg_rating),
    latestReviewAt: row.latest_review_at ? new Date(row.latest_review_at).toISOString() : null,
    excerpt: row.excerpt_source ? excerpt(row.excerpt_source) : null,
    reviewUrl: row.review_url,
  }))
  return {
    books,
    total: totals[0]?.total ?? 0,
    modern: options.modern,
    modernSinceYear: year,
    counts: { books: counts[0]?.books ?? 0, reviews: counts[0]?.reviews ?? 0 },
    backfill: {
      cursor: backfill[0]?.cursor_id ?? null,
      done: backfill[0]?.done ?? false,
      seen: backfill[0]?.reviews_seen ?? 0,
      note: backfill[0]?.note ?? null,
    },
  }
}

interface BookQuery {
  id: number
  title: string
  author: string | null
  translator: string | null
  publisher: string | null
  published_year: number | null
  category: string | null
  subcategory: string | null
  cover_url: string | null
  url: string
  review_count: number
  avg_rating: string | number | null
  latest_review_at: Date | string | null
  excerpt_source: string | null
  review_url: string | null
}
