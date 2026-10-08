import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BOOK_COLUMNS, REVIEW_COLUMNS, parseCsv } from '../src/simania/csv'
import { excerpt } from '../src/simania/parse'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const reviewsPath = resolve(root, 'data/simania-reviews.csv')
const booksPath = resolve(root, 'data/simania-books.csv')
const outPath = resolve(root, 'src/data/table-data.ts')
const catalogPath = resolve(root, 'src/data/catalog-data.ts')

const MIN_BODY = 80
const EXCERPT = 420

type Origin = 'original' | 'translated' | 'unknown'

interface ReviewSide {
  reviewId: string
  reviewerId: string
  reviewer: string
  rating: number
  likes: number
  excerpt: string
  url: string
  bodyLength: number
}

interface FanHit {
  bookId: string
  rating: number
  writtenAt: string
  reviewer: string
}

const ALSO_LIMIT = 3

function column(header: string[], name: string): number {
  const index = header.indexOf(name)
  if (index < 0) throw new Error(`missing column ${name}`)
  return index
}

function num(value: string): number | null {
  if (!value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function bookOrigin(subcategory: string, translator: string): Origin {
  if (subcategory === 'ספרות מקורית') return 'original'
  if (subcategory === 'ספרות מתורגמת' || subcategory === 'ספרות קלאסית') return 'translated'
  if (translator.trim()) return 'translated'
  return 'unknown'
}

function betterPraise(a: ReviewSide, b: ReviewSide): ReviewSide {
  if (a.rating !== b.rating) return a.rating > b.rating ? a : b
  if (a.likes !== b.likes) return a.likes > b.likes ? a : b
  if (a.bodyLength !== b.bodyLength) return a.bodyLength > b.bodyLength ? a : b
  return a.reviewId > b.reviewId ? a : b
}

function betterDissent(a: ReviewSide, b: ReviewSide): ReviewSide {
  if (a.rating !== b.rating) return a.rating < b.rating ? a : b
  if (a.likes !== b.likes) return a.likes > b.likes ? a : b
  if (a.bodyLength !== b.bodyLength) return a.bodyLength > b.bodyLength ? a : b
  return a.reviewId > b.reviewId ? a : b
}

function side(row: string[], index: Record<string, number>): ReviewSide | null {
  const body = row[index.body] ?? ''
  const flat = body.replace(/\s+/g, ' ').trim()
  if (flat.length < MIN_BODY) return null
  const rating = num(row[index.rating]) ?? 0
  const reviewId = row[index.review_id] ?? ''
  return {
    reviewId,
    reviewerId: (row[index.reviewer_id] ?? '').trim(),
    reviewer: (row[index.reviewer] ?? '').trim() || 'קורא בסימניה',
    rating,
    likes: num(row[index.likes]) ?? 0,
    excerpt: excerpt(flat, EXCERPT),
    url: (row[index.review_url] ?? '').trim() || `https://simania.co.il/showReview.php?reviewId=${reviewId}`,
    bodyLength: flat.length,
  }
}

const reviewsText = (await readFile(reviewsPath, 'utf8')).replace(/^\uFEFF/, '')
const booksText = (await readFile(booksPath, 'utf8')).replace(/^\uFEFF/, '')
const reviewRows = parseCsv(reviewsText).filter((row) => row.some((cell) => cell.trim()))
const bookRows = parseCsv(booksText).filter((row) => row.some((cell) => cell.trim()))
const reviewHeader = reviewRows[0]
const bookHeader = bookRows[0]
if (!reviewHeader || !bookHeader) throw new Error('empty csv')

const reviewIndex = Object.fromEntries(REVIEW_COLUMNS.map((name) => [name, column(reviewHeader, name)]))
const bookIndex = Object.fromEntries(BOOK_COLUMNS.map((name) => [name, column(bookHeader, name)]))

const praise = new Map<string, ReviewSide>()
const dissent = new Map<string, ReviewSide>()
const mentions = new Map<string, { count: number; reviewId: number; url: string }>()
const fanHits = new Map<string, FanHit[]>()

for (const row of reviewRows.slice(1)) {
  const bookId = row[reviewIndex.book_id] ?? ''
  if (!bookId) continue
  const reviewId = Number(row[reviewIndex.review_id])
  const reviewUrl =
    (row[reviewIndex.review_url] ?? '').trim() ||
    (Number.isFinite(reviewId) ? `https://simania.co.il/showReview.php?reviewId=${reviewId}` : '')
  const mention = mentions.get(bookId)
  if (!mention) mentions.set(bookId, { count: 1, reviewId: Number.isFinite(reviewId) ? reviewId : 0, url: reviewUrl })
  else {
    mention.count += 1
    if (Number.isFinite(reviewId) && reviewId >= mention.reviewId) {
      mention.reviewId = reviewId
      mention.url = reviewUrl
    }
  }
  const reviewerId = (row[reviewIndex.reviewer_id] ?? '').trim()
  const rating = num(row[reviewIndex.rating]) ?? 0
  if (rating >= 4 && reviewerId) {
    const hits = fanHits.get(reviewerId) ?? []
    hits.push({
      bookId,
      rating,
      writtenAt: (row[reviewIndex.written_at] ?? '').trim(),
      reviewer: (row[reviewIndex.reviewer] ?? '').trim() || 'קורא בסימניה',
    })
    fanHits.set(reviewerId, hits)
  }
  const voice = side(row, reviewIndex)
  if (!voice) continue
  if (voice.rating >= 4) {
    const current = praise.get(bookId)
    praise.set(bookId, current ? betterPraise(current, voice) : voice)
  } else if (voice.rating === 1 || voice.rating === 2) {
    const current = dissent.get(bookId)
    dissent.set(bookId, current ? betterDissent(current, voice) : voice)
  }
}

const catalog = []
const disputed = []
const listed = []
const bookMeta = new Map<string, { title: string; author: string; url: string }>()

for (const row of bookRows.slice(1)) {
  const id = row[bookIndex.book_id] ?? ''
  const title = (row[bookIndex.title] ?? '').trim()
  if (!id || !title) continue
  const author = (row[bookIndex.author] ?? '').trim()
  const subcategory = (row[bookIndex.subcategory] ?? '').trim()
  const translator = (row[bookIndex.translator] ?? '').trim()
  const origin = bookOrigin(subcategory, translator)
  const year = num(row[bookIndex.published_year] ?? '')
  const category = (row[bookIndex.category] ?? '').trim()
  catalog.push({ id, title, author, year, category, subcategory, origin })
  const bookUrl = (row[bookIndex.book_url] ?? '').trim() || `https://simania.co.il/bookdetails.php?item_id=${id}`
  bookMeta.set(id, { title, author, url: bookUrl })
  const mention = mentions.get(id)
  const rating = num(row[bookIndex.avg_rating] ?? '')
  listed.push({
    id,
    title,
    author,
    translator,
    publisher: (row[bookIndex.publisher] ?? '').trim(),
    publishedYear: year,
    category,
    subcategory,
    coverUrl: (row[bookIndex.cover_url] ?? '').trim(),
    url: (row[bookIndex.book_url] ?? '').trim() || `https://simania.co.il/bookdetails.php?item_id=${id}`,
    reviewCount: mention?.count ?? 0,
    avgRating: rating && rating > 0 ? rating : null,
    excerpt: excerpt((row[bookIndex.description] ?? '').replace(/\s+/g, ' ').trim(), 280),
    reviewUrl: mention?.url ?? '',
  })
  const good = praise.get(id)
  const bad = dissent.get(id)
  if (!good || !bad) continue
  const pages = num(row[bookIndex.pages] ?? '')
  const coverUrl = (row[bookIndex.cover_url] ?? '').trim()
  const avgRating = rating && rating > 0 ? rating : null
  const reviewCount = num(row[bookIndex.simania_review_count] ?? '')
  disputed.push({
    id,
    title,
    author,
    translator,
    year,
    pages,
    category,
    subcategory,
    origin,
    coverUrl,
    bookUrl,
    avgRating,
    simaniaReviewCount: reviewCount && reviewCount > 0 ? reviewCount : null,
    description: cleanDescription(row[bookIndex.description] ?? ''),
    praise: publicSide(good),
    dissent: publicSide(bad),
    advocates: [] as ReturnType<typeof advocatesFor>,
  })
}

for (const book of disputed) {
  const featured = praise.get(book.id)
  book.advocates = advocatesFor(book.id, featured?.reviewerId ?? '')
}

catalog.sort((a, b) => a.id.localeCompare(b.id))
disputed.sort((a, b) => a.id.localeCompare(b.id))

function cleanDescription(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 4000)
}

function otherBooks(reviewerId: string, currentId: string): { also: { id: string; title: string; author: string; url: string }[]; more: number } {
  const best = new Map<string, FanHit>()
  for (const hit of fanHits.get(reviewerId) ?? []) {
    if (hit.bookId === currentId || !bookMeta.get(hit.bookId)?.title) continue
    const prev = best.get(hit.bookId)
    if (!prev || hit.rating > prev.rating || (hit.rating === prev.rating && hit.writtenAt > prev.writtenAt)) best.set(hit.bookId, hit)
  }
  const ranked = [...best.values()].sort(
    (a, b) => b.rating - a.rating || b.writtenAt.localeCompare(a.writtenAt) || a.bookId.localeCompare(b.bookId),
  )
  return {
    also: ranked.slice(0, ALSO_LIMIT).map((hit) => {
      const meta = bookMeta.get(hit.bookId)!
      return { id: hit.bookId, title: meta.title, author: meta.author, url: meta.url }
    }),
    more: Math.max(0, ranked.length - ALSO_LIMIT),
  }
}

function advocatesFor(bookId: string, featuredId: string) {
  const people = new Map<string, { reviewer: string; rating: number }>()
  for (const [reviewerId, hits] of fanHits) {
    const here = hits.filter((hit) => hit.bookId === bookId)
    if (here.length === 0) continue
    const best = here.reduce((left, right) => (left.rating >= right.rating ? left : right))
    people.set(reviewerId, { reviewer: best.reviewer, rating: best.rating })
  }
  return [...people.entries()]
    .map(([reviewerId, person]) => ({ reviewer: person.reviewer, rating: person.rating, reviewerId, ...otherBooks(reviewerId, bookId) }))
    .filter((person) => person.also.length > 0)
    .sort(
      (a, b) =>
        Number(b.reviewerId === featuredId) - Number(a.reviewerId === featuredId) ||
        b.rating - a.rating ||
        a.reviewer.localeCompare(b.reviewer, 'he'),
    )
    .map(({ reviewer, also, more }) => ({ reviewer, also, more }))
}

function publicSide(voice: ReviewSide) {
  return {
    reviewId: voice.reviewId,
    reviewer: voice.reviewer,
    rating: voice.rating,
    excerpt: voice.excerpt,
    url: voice.url,
  }
}

function emit(name: string, type: string, rows: unknown[]): string {
  const lines = rows.map((row) => `  ${JSON.stringify(row)},`).join('\n')
  return `export const ${name}: ${type} = [\n${lines}\n]\n`
}

const seedType = `Array<{
  id: string
  title: string
  author: string
  year: number | null
  category: string
  subcategory: string
  origin: 'original' | 'translated' | 'unknown'
}>`

const bookType = `Array<{
  id: string
  title: string
  author: string
  translator: string
  year: number | null
  pages: number | null
  category: string
  subcategory: string
  origin: 'original' | 'translated' | 'unknown'
  coverUrl: string
  bookUrl: string
  avgRating: number | null
  simaniaReviewCount: number | null
  description: string
  praise: { reviewId: string; reviewer: string; rating: number; excerpt: string; url: string }
  dissent: { reviewId: string; reviewer: string; rating: number; excerpt: string; url: string }
  advocates: Array<{
    reviewer: string
    also: Array<{ id: string; title: string; author: string; url: string }>
    more: number
  }>
}>`

const listedType = `Array<{
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
}>`

const file = `// Generated by scripts/build-table.ts from the Simania CSV files. Do not edit by hand.
${emit('catalogIndex', seedType, catalog)}
${emit('disputedBooks', bookType, disputed)}
`
const catalogFile = `// Generated by scripts/build-table.ts from the Simania CSV files. Do not edit by hand.
export const reviewTotal = ${reviewRows.length - 1}

${emit('catalogBooks', listedType, listed)}
`

await writeFile(outPath, file)
await writeFile(catalogPath, catalogFile)
const byOrigin = { original: 0, translated: 0, unknown: 0 }
const bySub = new Map<string, number>()
for (const book of disputed) {
  byOrigin[book.origin] += 1
  bySub.set(book.subcategory || '—', (bySub.get(book.subcategory || '—') ?? 0) + 1)
}
console.log(
  JSON.stringify(
    {
      catalog: catalog.length,
      listed: listed.length,
      reviews: reviewRows.length - 1,
      disputed: disputed.length,
      withOtherBooks: disputed.filter((book) => book.advocates.length > 0).length,
      byOrigin,
      subcategories: [...bySub.entries()].sort((a, b) => b[1] - a[1]),
    },
    null,
    2,
  ),
)
