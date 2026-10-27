import { proseLabel, readingOf, worldLabel, type BookReading } from '../data/readings'
import type { Seek } from '../types'
import { arguedBooks, poolFor, seedById, type DisputedBook, type OriginChoice } from './table'

export type MarkKind = 'loved' | 'disliked' | 'want' | 'skip'

export interface TasteMark {
  bookId: string
  title: string
  author: string
  kind: MarkKind
  at: number
}

export interface BookTaste {
  fit: number | null
  certainty: number
  collecting: boolean
  reasons: string[]
  gap: string | null
}

export interface TastePick {
  book: DisputedBook
  taste: BookTaste
}

export interface TasteHome {
  certainty: number
  collecting: boolean
  line: string
  starters: DisputedBook[]
  picks: TastePick[]
}

export const markLabel: Record<MarkKind, string> = {
  loved: 'קראתי ואהבתי',
  disliked: 'קראתי, לא בשבילי',
  want: 'בא לי לנסות',
  skip: 'לא מעניין',
}

const pullLine: Record<Seek, string> = {
  grip: 'משהו שתופס',
  feel: 'משהו שנוגע',
  lift: 'משהו שמרים',
  learn: 'משהו שמלמד',
  weird: 'משהו שמפתיע',
}

const strong = new Set<MarkKind>(['loved', 'disliked'])

export function evidenceWeight(mark: TasteMark): number {
  if (strong.has(mark.kind)) return readingOf(mark.bookId) ? 12 : 4
  return 3
}

/** How much of the reader is on file. One loved book stays under 20. The ceiling is 90. */
export function readerCertainty(marks: TasteMark[]): number {
  const total = marks.reduce((sum, mark) => sum + evidenceWeight(mark), 0)
  if (total <= 0) return 0
  return Math.min(90, Math.round((total / (total + 48)) * 90))
}

export function bookTaste(book: DisputedBook, marks: TasteMark[]): BookTaste {
  const certainty = readerCertainty(marks)
  if (marks.length === 0) {
    return {
      fit: null,
      certainty: 0,
      collecting: true,
      reasons: [],
      gap: 'עדיין אין טעם שמור. סמנו ספר שקראתם.',
    }
  }
  const reading = readingOf(book.id)
  const notes = reading ? profileNotes(book, reading, marks) : coarseNotes(book, marks)
  const judged = notes.filter((note) => strong.has(note.kind)).length
  const cap = judged <= 0 ? 12 : judged === 1 ? 24 : judged === 2 ? 48 : 90
  const bookCertainty = Math.min(certainty, cap)
  return {
    fit: notes.length === 0 ? null : scoreFit(notes),
    certainty: bookCertainty,
    collecting: bookCertainty < 20,
    reasons: notes.slice(0, 3).map((note) => note.reason),
    gap: reading ? gapFor(reading, marks) : 'אין לספר הזה קריאה שמורה, אז הכתיבה והתגיות לא נכנסות לחשבון.',
  }
}

export function tasteHome(marks: TasteMark[], lens: { origin?: OriginChoice; themes?: string[] } = {}): TasteHome {
  const certainty = readerCertainty(marks)
  const themes = lens.themes ?? []
  const origin = lens.origin ?? 'either'
  return {
    certainty,
    collecting: certainty < 20,
    line: portrait(marks),
    starters: marks.length === 0 || tastePicks(marks, origin, themes).length === 0 ? starterBooks() : [],
    picks: marks.length === 0 ? [] : tastePicks(marks, origin, themes),
  }
}

function tastePicks(marks: TasteMark[], origin: OriginChoice, themes: string[]): TastePick[] {
  const banned = new Set(marks.map((mark) => mark.bookId))
  const narrow = poolFor(origin, banned)
  const pool = narrow.length >= 3 ? narrow : arguedBooks.filter((book) => !banned.has(book.id))
  return pool
    .map((book) => ({ book, taste: bookTaste(book, marks) }))
    .filter((pick) => pick.taste.fit !== null)
    .sort((a, b) => themeHits(b.book.id, themes) - themeHits(a.book.id, themes) || (b.taste.fit ?? 0) - (a.taste.fit ?? 0) || a.book.id.localeCompare(b.book.id))
    .slice(0, 3)
}

function starterBooks(): DisputedBook[] {
  return [...arguedBooks].sort((a, b) => a.title.localeCompare(b.title, 'he') || a.id.localeCompare(b.id)).slice(0, 6)
}

function portrait(marks: TasteMark[]): string {
  if (marks.length === 0) return 'עדיין אין טעם שמור. סמנו ספר שקראתם.'
  const worlds = new Map<string, number>()
  const prose = new Map<string, number>()
  const pulls = new Map<string, number>()
  for (const mark of marks) {
    const reading = readingOf(mark.bookId)
    if (!reading) continue
    const vote = voteOf(mark.kind)
    prose.set(proseLabel[reading.prose], (prose.get(proseLabel[reading.prose]) ?? 0) + vote)
    pulls.set(pullLine[reading.pull], (pulls.get(pullLine[reading.pull]) ?? 0) + vote)
    for (const world of reading.worlds) worlds.set(worldLabel[world], (worlds.get(worldLabel[world]) ?? 0) + vote)
  }
  const likedWorlds = top(worlds, 2, 2)
  const likedProse = top(prose, 1, 2)[0]
  const avoided = bottom(worlds, -2)
  if (!likedProse && likedWorlds.length === 0 && !avoided) {
    return 'סימנתם ספרים בלי קריאה שמורה. בינתיים נשענים על ז׳אנר ומקור.'
  }
  const draw = [likedProse ? `כתיבה ${likedProse}` : '', ...likedWorlds].filter(Boolean)
  const head = draw.length > 0 ? `נמשך ל${draw.join(' ול')}` : 'הטעם עוד מתמלא'
  return avoided ? `${head}. פחות ל${avoided}.` : `${head}.`
}

interface Note {
  kind: MarkKind
  weight: number
  reason: string
}

function profileNotes(book: DisputedBook, reading: BookReading, marks: TasteMark[]): Note[] {
  const notes: Note[] = []
  for (const mark of marks) {
    const other = readingOf(mark.bookId)
    const shared = other ? sharedTraits(other, reading) : coarseShared(mark, book)
    if (shared.length === 0) continue
    notes.push({ kind: mark.kind, weight: weightOf(mark.kind), reason: reasonFor(mark, shared) })
  }
  return notes.sort((a, b) => b.weight - a.weight || a.reason.localeCompare(b.reason, 'he'))
}

function coarseNotes(book: DisputedBook, marks: TasteMark[]): Note[] {
  const notes: Note[] = []
  for (const mark of marks) {
    const shared = coarseShared(mark, book)
    if (shared.length === 0) continue
    notes.push({ kind: mark.kind, weight: weightOf(mark.kind), reason: reasonFor(mark, shared) })
  }
  return notes.sort((a, b) => b.weight - a.weight || a.reason.localeCompare(b.reason, 'he'))
}

function sharedTraits(left: BookReading, right: BookReading): string[] {
  const shared: string[] = []
  if (Math.abs(left.prose - right.prose) <= 1) shared.push(`כתיבה ${proseLabel[right.prose]}`)
  if (left.pull === right.pull) shared.push(pullLine[left.pull])
  for (const world of right.worlds) if (left.worlds.includes(world)) shared.push(worldLabel[world])
  for (const theme of right.themes) if (left.themes.includes(theme)) shared.push(theme)
  return shared
}

function coarseShared(mark: TasteMark, book: DisputedBook): string[] {
  const seed = seedById(mark.bookId)
  const author = seed?.author || mark.author
  const shared: string[] = []
  if (author && author === book.author) shared.push(`אותו מחבר, ${book.author}`)
  if (seed?.subcategory && seed.subcategory === book.subcategory) shared.push(book.subcategory)
  if (seed && seed.origin !== 'unknown' && seed.origin === book.origin) shared.push(book.origin === 'original' ? 'מקור' : 'תרגום')
  return shared
}

function reasonFor(mark: TasteMark, shared: string[]): string {
  const bit = shared.slice(0, 3).join(', ')
  if (mark.kind === 'loved') return `אהבתם את ${mark.title}, וגם כאן ${bit}.`
  if (mark.kind === 'want') return `סימנתם את ${mark.title} כמשהו שבא לכם, וגם כאן ${bit}.`
  if (mark.kind === 'disliked') return `לא אהבתם את ${mark.title}, ויש כאן ${bit}.`
  return `סימנתם את ${mark.title} כלא מעניין, ויש כאן ${bit}.`
}

function scoreFit(notes: Note[]): number {
  let pos = 0
  let neg = 0
  for (const note of notes) {
    if (note.kind === 'loved' || note.kind === 'want') pos += note.weight
    else neg += note.weight
  }
  return Math.min(96, Math.max(8, Math.round(50 + 12 * pos - 14 * neg)))
}

function weightOf(kind: MarkKind): number {
  if (kind === 'loved' || kind === 'disliked') return 2
  return 1
}

function voteOf(kind: MarkKind): number {
  if (kind === 'loved') return 2
  if (kind === 'want') return 1
  if (kind === 'disliked') return -2
  return -1
}

function gapFor(reading: BookReading, marks: TasteMark[]): string | null {
  const seen = marks.map((mark) => readingOf(mark.bookId)).filter((item): item is BookReading => item !== null)
  if (seen.length === 0) return 'עוד אין קריאה שמורה בספרים שסימנתם, אז הכתיבה והתגיות לא נכנסות לחשבון.'
  if (!seen.some((item) => Math.abs(item.prose - reading.prose) <= 1)) {
    return `עוד לא דירגתם ספר עם כתיבה ${proseLabel[reading.prose]}, אז זה לא נכנס לחשבון.`
  }
  const world = reading.worlds.find((item) => !seen.some((other) => other.worlds.includes(item)))
  if (world) return `עוד לא דירגתם ספר על ${worldLabel[world]}, אז זה לא נכנס לחשבון.`
  if (!seen.some((item) => item.pull === reading.pull)) {
    return `עוד לא דירגתם ספר של ${pullLine[reading.pull]}, אז זה לא נכנס לחשבון.`
  }
  return null
}

function themeHits(bookId: string, themes: string[]): number {
  const reading = readingOf(bookId)
  if (!reading || themes.length === 0) return 0
  return themes.filter((theme) => reading.themes.includes(theme)).length
}

function top(scores: Map<string, number>, count: number, floor: number): string[] {
  return [...scores.entries()]
    .filter(([, score]) => score >= floor)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'he'))
    .slice(0, count)
    .map(([label]) => label)
}

function bottom(scores: Map<string, number>, ceiling: number): string | null {
  const found = [...scores.entries()]
    .filter(([, score]) => score <= ceiling)
    .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0], 'he'))
  return found[0]?.[0] ?? null
}
