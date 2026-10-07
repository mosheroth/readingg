export interface ParsedReview {
  reviewId: number
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
  reviewer: string | null
  reviewerId: number | null
  rating: number | null
  body: string
  writtenAt: string | null
  likes: number | null
}

const ORIGIN = 'https://simania.co.il'

export function reviewPageUrl(reviewId: number): string {
  return `${ORIGIN}/showReview.php?reviewId=${reviewId}`
}

export function bookPageUrl(bookId: number): string {
  return `${ORIGIN}/bookdetails.php?item_id=${bookId}`
}

export function feedUrl(): string {
  return `${ORIGIN}/reviews.php`
}

export function isChallenge(html: string): boolean {
  const title = html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? ''
  if (/just a moment/i.test(title) || title.includes('רק רגע')) return true
  return html.includes('cdn-cgi/challenge-platform') && !html.includes('__next_f')
}

export function parseFeedIds(html: string): number[] {
  const ids = new Set<number>()
  for (const match of html.matchAll(/showReview\.php\?reviewId=(\d+)/g)) {
    ids.add(Number(match[1]))
  }
  return [...ids].sort((a, b) => b - a)
}

export function parseReviewPage(html: string, reviewId: number): ParsedReview | null {
  if (isChallenge(html)) return null
  const chunks = extractChunks(html)
  const flight = chunks.join('\n')
  const texts = textRows(chunks)
  const review = objectsContaining(flight, 'content').find(
    (item) => item.id === reviewId && typeof item.bookId === 'number' && typeof item.content === 'string',
  )
  if (!review || typeof review.bookId !== 'number' || typeof review.content !== 'string') return null
  const content = resolveText(review.content, texts)
  if (!content) return null

  const book = objectsContaining(flight, 'publisher').find((item) => item.id === review.bookId)
  const nested = isRecord(review.book) ? review.book : null
  const reviewer = isRecord(review.reviewer) ? review.reviewer : null
  const title = text(book?.title) ?? text(nested?.title)
  if (!title) return null

  return {
    reviewId,
    bookId: review.bookId,
    title,
    author: text(book?.author) ?? text(nested?.author),
    translator: text(book?.translator),
    publisher: text(book?.publisher),
    publishedYear: yearOf(book?.year),
    pages: positiveInt(book?.pages),
    category: text(book?.category),
    subcategory: text(book?.subCategory),
    coverUrl: coverOf(book) ?? coverOf(nested),
    reviewer: text(reviewer?.name) ?? text(reviewer?.nickname),
    reviewerId: typeof review.userId === 'number' ? review.userId : intOf(reviewer?.id),
    rating: ratingOf(review.rating),
    body: content.trim().slice(0, 50_000),
    writtenAt: dateOf(review.date),
    likes: positiveOrZero(review.likesCount),
  }
}

export interface BookMeta {
  description: string | null
  subtitle: string | null
  englishTitle: string | null
  secondAuthor: string | null
  editor: string | null
  isbn: string | null
  danacode: string | null
  series: string | null
  seriesNumber: string | null
  language: string | null
  format: string | null
  avgRating: number | null
  ratingCount: number | null
  simaniaReviewCount: number | null
  viewCount: number | null
  ownersCount: number | null
  currentlyReading: number | null
  bookFetched: boolean
}

export function emptyBookMeta(): BookMeta {
  return {
    description: null,
    subtitle: null,
    englishTitle: null,
    secondAuthor: null,
    editor: null,
    isbn: null,
    danacode: null,
    series: null,
    seriesNumber: null,
    language: null,
    format: null,
    avgRating: null,
    ratingCount: null,
    simaniaReviewCount: null,
    viewCount: null,
    ownersCount: null,
    currentlyReading: null,
    bookFetched: true,
  }
}

export function parseBookPage(html: string, bookId: number): BookMeta | null {
  if (isChallenge(html)) return null
  const chunks = extractChunks(html)
  const flight = chunks.join('\n')
  const book = objectWithNumericId(flight, bookId)
  if (!book) return null
  const schema = schemaForBook(flight, bookId)
  const rating = isRecord(schema?.aggregateRating) ? schema.aggregateRating : null
  const description = typeof book.description === 'string' ? resolveText(book.description, textRows(chunks)) : null
  return {
    description: description ? description.trim().slice(0, 20_000) : null,
    subtitle: text(book.subtitle),
    englishTitle: text(book.nameInEnglish),
    secondAuthor: text(book.author2),
    editor: text(book.editor),
    isbn: codeOf(book.isbn),
    danacode: codeOf(book.danacode),
    series: text(book.series),
    seriesNumber: codeOf(book.seriesNumber),
    language: text(book.language) ?? text(schema?.inLanguage),
    format: formatOf(book, schema),
    avgRating: decimal(rating?.ratingValue),
    ratingCount: positiveOrZero(rating?.ratingCount),
    simaniaReviewCount: positiveOrZero(book.reviewCount),
    viewCount: positiveOrZero(book.viewCount),
    ownersCount: positiveOrZero(book.ownersCount),
    currentlyReading: positiveOrZero(book.currentlyReading),
    bookFetched: true,
  }
}

export function excerpt(body: string, max = 280): string {
  const flat = body.replace(/\s+/g, ' ').trim()
  if (flat.length <= max) return flat
  const cut = flat.slice(0, max)
  const space = cut.lastIndexOf(' ')
  const trimmed = (space > 80 ? cut.slice(0, space) : cut).trim()
  return `${trimmed}…`
}

export function appearanceCutoff(now: Date): Date {
  const copy = new Date(now.getTime())
  copy.setUTCFullYear(copy.getUTCFullYear() - 2)
  return copy
}

export function modernPublishedYear(now: Date): number {
  return now.getUTCFullYear() - 2
}

function extractChunks(html: string): string[] {
  const marker = 'self.__next_f.push('
  const chunks: string[] = []
  let cursor = 0
  while ((cursor = html.indexOf(marker, cursor)) !== -1) {
    const start = cursor + marker.length
    const end = endOfCall(html, start)
    if (end === -1) break
    try {
      const parsed = JSON.parse(html.slice(start, end)) as unknown
      if (Array.isArray(parsed) && typeof parsed[1] === 'string') chunks.push(parsed[1])
    } catch {
      // A flight chunk that is not JSON is not catalog data.
    }
    cursor = end + 1
  }
  return chunks
}

function textRows(chunks: string[]): Map<string, string> {
  const rows = new Map<string, string>()
  for (let index = 0; index < chunks.length; index += 1) {
    const match = chunks[index].match(/^([0-9a-f]+):T([0-9a-f]+),(.*)$/is)
    if (!match) continue
    const byteLength = Number.parseInt(match[2], 16)
    const pieces = [match[3]]
    let have = Buffer.byteLength(match[3])
    while (have < byteLength && index + 1 < chunks.length) {
      index += 1
      pieces.push(chunks[index])
      have += Buffer.byteLength(chunks[index])
    }
    const bytes = Buffer.concat(pieces.map((piece) => Buffer.from(piece)))
    rows.set(match[1].toLowerCase(), bytes.subarray(0, byteLength).toString('utf8'))
  }
  return rows
}

function resolveText(value: string, rows: Map<string, string>): string | null {
  if (!isPointer(value)) return value.trim() ? value : null
  const resolved = rows.get(value.slice(1).toLowerCase())
  return resolved && resolved.trim() ? resolved : null
}

function endOfCall(text: string, start: number): number {
  let depth = 0
  let inString = false
  let escaped = false
  for (let index = start; index < text.length; index += 1) {
    const char = text[index]
    if (inString) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') inString = false
      continue
    }
    if (char === '"') {
      inString = true
      continue
    }
    if (char === '(' || char === '[' || char === '{') depth += 1
    else if (char === ')' || char === ']' || char === '}') {
      depth -= 1
      if (char === ')' && depth < 0) return index
    }
  }
  return -1
}

function objectWithNumericId(flight: string, id: number): Record<string, unknown> | null {
  for (const needle of [`"id":${id}`, `"id": ${id}`]) {
    let cursor = 0
    while ((cursor = flight.indexOf(needle, cursor)) !== -1) {
      const after = flight[cursor + needle.length] ?? ''
      if (/\d/.test(after)) {
        cursor += needle.length
        continue
      }
      const start = flight.lastIndexOf('{', cursor)
      const value = start >= 0 ? parseObjectAt(flight, start) : null
      if (isRecord(value) && value.id === id) return value
      cursor += needle.length
    }
  }
  return null
}

function schemaForBook(flight: string, bookId: number): Record<string, unknown> | null {
  for (const needle of [`"productID":"${bookId}"`, `"productID": "${bookId}"`]) {
    const at = flight.indexOf(needle)
    if (at === -1) continue
    const start = flight.lastIndexOf('{', at)
    const value = start >= 0 ? parseObjectAt(flight, start) : null
    if (isRecord(value)) return value
  }
  return null
}

function formatOf(book: Record<string, unknown>, schema: Record<string, unknown> | null): string | null {
  if (book.isAudioBook === 1 || book.isAudioBook === true) return 'audio'
  const raw = text(schema?.bookFormat) ?? ''
  const name = raw.split('/').pop() ?? ''
  if (name === 'Paperback' || name === 'Hardcover' || name === 'EBook' || name === 'AudiobookFormat') return name
  return null
}

function objectsContaining(flight: string, key: string): Record<string, unknown>[] {
  const needle = `"${key}":`
  const found: Record<string, unknown>[] = []
  let cursor = 0
  while ((cursor = flight.indexOf(needle, cursor)) !== -1) {
    let start = cursor
    while (start > 0 && cursor - start < 20_000) {
      start = flight.lastIndexOf('{', start - 1)
      if (start < 0) break
      const value = parseObjectAt(flight, start)
      if (isRecord(value) && key in value) {
        found.push(value)
        break
      }
    }
    cursor += needle.length
  }
  return found
}

function parseObjectAt(text: string, start: number): unknown {
  if (text[start] !== '{') return null
  let depth = 0
  let inString = false
  let escaped = false
  for (let index = start; index < text.length; index += 1) {
    const char = text[index]
    if (inString) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') inString = false
      continue
    }
    if (char === '"') {
      inString = true
      continue
    }
    if (char === '{') depth += 1
    else if (char === '}') {
      depth -= 1
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, index + 1)) as unknown
        } catch {
          return null
        }
      }
    }
  }
  return null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPointer(value: string): boolean {
  return /^\$[0-9a-z]+$/i.test(value.trim())
}

function text(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function textish(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return text(value)
}

function codeOf(value: unknown): string | null {
  const raw = textish(value)
  if (!raw || raw === '0') return null
  return raw
}

function decimal(value: unknown): number | null {
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(number) || number < 0 || number > 10) return null
  return Math.round(number * 100) / 100
}

function yearOf(value: unknown): number | null {
  const year = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(year) || year < 1800 || year > 2100) return null
  return year
}

function positiveInt(value: unknown): number | null {
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(number) || number < 1) return null
  return number
}

function positiveOrZero(value: unknown): number | null {
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(number) || number < 0) return null
  return number
}

function intOf(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) ? value : null
}

function ratingOf(value: unknown): number | null {
  const rating = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(rating) || rating < 0 || rating > 10) return null
  return rating
}

function dateOf(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null
  const time = Date.parse(value)
  if (Number.isNaN(time)) return null
  return new Date(time).toISOString()
}

function coverOf(record: Record<string, unknown> | null | undefined): string | null {
  if (!record) return null
  const direct = text(record.imageUrl)
  if (direct) return direct
  const link = text(record.imageLink)
  if (!link) return null
  if (link.startsWith('http')) return link
  return `https://cdn.simania.co.il${link.startsWith('/') ? link : `/${link}`}`
}
