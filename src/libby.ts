export const LIBRARY_KEY = 'telaviv'
export const PAGE_SIZE = 24

export type Audience = 'juvenile' | 'youngadult'
export type Kind = 'ebook' | 'audiobook'

export type Topic = { id: string; label: string }

export const TOPICS: Topic[] = [
  { id: '', label: 'הכל' },
  { id: '24', label: 'פנטזיה' },
  { id: '80', label: 'מדע בדיוני' },
  { id: '58', label: 'מיתולוגיה' },
  { id: '82', label: 'סיפורים קצרים' },
  { id: '123', label: 'הומור' },
  { id: '57', label: 'בלשות' },
  { id: '86', label: 'מתח' },
  { id: '100', label: 'מותחנים' },
  { id: '115', label: 'היסטוריה' },
  { id: '77', label: 'רומנטיקה' },
  { id: '12', label: 'קומיקס' },
  { id: '18', label: 'דרמה' },
  { id: '112', label: 'ספרי תמונות' },
  { id: '45', label: 'עיון' },
]

export type Book = {
  id: string
  title: string
  author: string
  description: string
  cover: string
  kind: Kind
  available: boolean
  copies: number
  holds: number
  sample: string
}

export type ShelfQuery = {
  audience: Audience
  kind: Kind
  subject: string
  query: string
  page: number
}

export function readUrl(id: string): string {
  return `https://libbyapp.com/library/${LIBRARY_KEY}/everything/page-1/${encodeURIComponent(id)}`
}

export function searchUrl(shelf: ShelfQuery): string {
  const params = new URLSearchParams({
    language: 'he',
    maturityLevel: shelf.audience,
    mediaTypes: shelf.kind,
    sortBy: 'mostpopular',
    perPage: String(PAGE_SIZE),
    page: String(shelf.page),
  })
  if (shelf.subject) params.set('subject', shelf.subject)
  const query = shelf.query.trim()
  if (query) params.set('query', query)
  return `https://thunder.api.overdrive.com/v2/libraries/${LIBRARY_KEY}/media?${params}`
}

export function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

type RawBook = {
  id?: string | number
  title?: string
  firstCreatorName?: string
  description?: string
  covers?: { cover150Wide?: { href?: string }; cover300Wide?: { href?: string } }
  type?: { id?: string }
  isAvailable?: boolean
  availableCopies?: number
  holdsCount?: number
  sample?: { href?: string }
}

export function toBook(raw: RawBook): Book | null {
  if (raw.id == null || !raw.title) return null
  const kind: Kind = raw.type?.id === 'audiobook' ? 'audiobook' : 'ebook'
  return {
    id: String(raw.id),
    title: raw.title,
    author: raw.firstCreatorName || '',
    description: plainText(raw.description || ''),
    cover: raw.covers?.cover300Wide?.href || raw.covers?.cover150Wide?.href || '',
    kind,
    available: Boolean(raw.isAvailable),
    copies: raw.availableCopies || 0,
    holds: raw.holdsCount || 0,
    sample: raw.sample?.href || '',
  }
}

export function availability(book: Book): string {
  if (book.available) {
    return book.copies > 0 ? `זמין עכשיו · ${book.copies} עותקים` : 'זמין עכשיו'
  }
  return book.holds > 0 ? `תפוס · ${book.holds} ממתינים` : 'תפוס'
}
