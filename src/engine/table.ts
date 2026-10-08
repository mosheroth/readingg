import { catalogIndex, disputedBooks } from '../data/table-data'

export type TableOrigin = 'original' | 'translated' | 'unknown'
export type Direction = 'similar' | 'different' | 'surprise'
export type OriginChoice = 'original' | 'translated' | 'either'

export interface CatalogSeed {
  id: string
  title: string
  author: string
  year: number | null
  category: string
  subcategory: string
  origin: TableOrigin
}

export interface Voice {
  reviewId: string
  reviewer: string
  rating: number
  excerpt: string
  url: string
}

export interface DisputedBook {
  id: string
  title: string
  author: string
  year: number | null
  pages: number | null
  category: string
  subcategory: string
  origin: TableOrigin
  coverUrl: string
  bookUrl: string
  praise: Voice
  dissent: Voice
}

export interface TableAnswers {
  seedId: string | null
  direction: Direction
  origin: OriginChoice
}

export const catalogSeeds: CatalogSeed[] = catalogIndex
export const arguedBooks: DisputedBook[] = disputedBooks

const byId = new Map(catalogSeeds.map((seed) => [seed.id, seed]))

export function seedById(id: string | null): CatalogSeed | null {
  if (!id) return null
  return byId.get(id) ?? null
}

export function bookByTableId(id: string): DisputedBook | null {
  return arguedBooks.find((book) => book.id === id) ?? null
}

export function fold(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[\u0591-\u05C7]/g, '')
    .replace(/["'״׳]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

const folded = catalogSeeds.map((seed) => ({
  seed,
  title: fold(seed.title),
  author: fold(seed.author),
}))

export function searchBooks(query: string, limit = 8): CatalogSeed[] {
  const needle = fold(query)
  if (needle.length < 2) return []
  const hits: { seed: CatalogSeed; rank: number }[] = []
  for (const row of folded) {
    const titleAt = row.title.indexOf(needle)
    const authorAt = row.author.indexOf(needle)
    if (titleAt < 0 && authorAt < 0) continue
    let rank = 0
    if (titleAt === 0) rank += 100
    else if (titleAt > 0) rank += 60
    if (authorAt === 0) rank += 30
    else if (authorAt > 0) rank += 10
    hits.push({ seed: row.seed, rank })
  }
  hits.sort(
    (a, b) => b.rank - a.rank || a.seed.title.localeCompare(b.seed.title, 'he') || a.seed.id.localeCompare(b.seed.id),
  )
  return hits.slice(0, limit).map((hit) => hit.seed)
}

function narrowOrigin(available: DisputedBook[], origin: OriginChoice): DisputedBook[] {
  if (origin === 'either') return available
  const exact = available.filter((book) => book.origin === origin)
  if (exact.length >= 3) return exact
  const loose = available.filter((book) => book.origin === origin || book.origin === 'unknown')
  if (loose.length >= 3) return loose
  return available
}

function scoreBook(book: DisputedBook, seed: CatalogSeed | null, direction: Direction): number {
  const gap = book.praise.rating - book.dissent.rating
  if (!seed) {
    if (direction === 'different') return gap * 10
    if (direction === 'surprise') return gap * 10
    return gap + book.praise.excerpt.length / 400 + book.dissent.excerpt.length / 400
  }
  const sameSub = Boolean(seed.subcategory) && book.subcategory === seed.subcategory
  const sameCat = Boolean(seed.category) && book.category === seed.category
  let score = gap
  if (direction === 'similar') {
    if (sameSub) score += 50
    else if (sameCat) score += 18
    if (seed.origin !== 'unknown' && book.origin === seed.origin) score += 4
    if (seed.year && book.year && Math.abs(seed.year - book.year) <= 4) score += 2
  } else if (direction === 'different') {
    if (sameCat && !sameSub) score += 24
    else if (!sameCat) score += 16
    if (sameSub) score -= 30
  } else {
    if (!sameCat) score += 22
    else if (!sameSub) score += 10
    if (sameSub) score -= 20
    score += gap
  }
  return score
}

function diverse(ranked: DisputedBook[], count: number): DisputedBook[] {
  const chosen: DisputedBook[] = []
  const seen = new Set<string>()
  for (const book of ranked) {
    if (chosen.length === count) break
    const key = book.subcategory || book.category || book.id
    if (seen.has(key)) continue
    seen.add(key)
    chosen.push(book)
  }
  for (const book of ranked) {
    if (chosen.length === count) break
    if (!chosen.some((item) => item.id === book.id)) chosen.push(book)
  }
  return chosen
}

export function pickThree(answers: TableAnswers, exclude: string[] = []): DisputedBook[] {
  const banned = new Set(exclude)
  if (answers.seedId) banned.add(answers.seedId)
  const pool = narrowOrigin(
    arguedBooks.filter((book) => !banned.has(book.id)),
    answers.origin,
  )
  const seed = seedById(answers.seedId)
  const ranked = pool
    .map((book) => ({ book, score: scoreBook(book, seed, answers.direction) }))
    .sort((a, b) => b.score - a.score || a.book.id.localeCompare(b.book.id))
    .map((item) => item.book)
  if (answers.direction === 'similar') return ranked.slice(0, 3)
  return diverse(ranked, 3)
}

const directionText: Record<Direction, string> = {
  similar: 'עוד מאותו עולם',
  different: 'כיוון אחר',
  surprise: 'הפתעה',
}

const originText: Record<OriginChoice, string> = {
  original: 'מקור',
  translated: 'תרגום',
  either: 'מקור או תרגום',
}

export function tableSummary(answers: TableAnswers): string {
  const seed = seedById(answers.seedId)
  const tail = `${directionText[answers.direction]} · ${originText[answers.origin]}`
  if (!seed) return tail
  const who = seed.author ? ` של ${seed.author}` : ''
  return `אחרי «${seed.title}»${who} · ${tail}`
}
