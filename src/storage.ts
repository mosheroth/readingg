import type { Direction, OriginChoice, TableAnswers } from './engine/table'
import type { Answers, Recommendation } from './types'

const SHELF_KEY = 'shulchan-shelf'
const SESSION_KEY = 'shulchan-session'

export interface ShelfItem {
  bookId: string
  personaId: string
  personaName: string
  title: string
  author: string
  chosenAt: number
}

export interface ShowDraft {
  seedId: string | null
  direction?: Direction
  origin?: OriginChoice
}

export type Session =
  | { name: 'intro' }
  | { name: 'quiz'; step: number; answers: Partial<Answers> }
  | { name: 'results'; answers: Answers; exclude: string[] }
  | { name: 'chosen'; answers: Answers; exclude: string[]; bookId: string; personaId: string }
  | { name: 'show'; step: 0 | 1 | 2; draft: ShowDraft }
  | { name: 'show-results'; answers: TableAnswers; exclude: string[] }
  | { name: 'show-chosen'; answers: TableAnswers; exclude: string[]; bookId: string }

function isShelfItem(value: unknown): value is ShelfItem {
  if (!value || typeof value !== 'object') return false
  const item = value as ShelfItem
  return typeof item.bookId === 'string' && typeof item.title === 'string' && item.title.length > 0
}

export function loadShelf(): ShelfItem[] {
  try {
    const raw = localStorage.getItem(SHELF_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter(isShelfItem) : []
  } catch {
    return []
  }
}

function writeShelf(next: ShelfItem): ShelfItem[] {
  const shelf = [next, ...loadShelf().filter((item) => item.bookId !== next.bookId)].slice(0, 12)
  localStorage.setItem(SHELF_KEY, JSON.stringify(shelf))
  return shelf
}

export function saveChoice(rec: Recommendation): ShelfItem[] {
  return writeShelf({
    bookId: rec.book.id,
    personaId: rec.persona.id,
    personaName: rec.persona.name,
    title: rec.book.title,
    author: rec.book.author,
    chosenAt: Date.now(),
  })
}

export function saveTableChoice(book: { id: string; title: string; author: string }): ShelfItem[] {
  return writeShelf({
    bookId: book.id,
    personaId: 'table',
    personaName: 'השולחן',
    title: book.title,
    author: book.author,
    chosenAt: Date.now(),
  })
}

function isSession(value: unknown): value is Session {
  if (!value || typeof value !== 'object') return false
  const session = value as Session
  if (session.name === 'intro') return true
  if (session.name === 'quiz') return typeof session.step === 'number' && typeof session.answers === 'object'
  if (session.name === 'results' || session.name === 'chosen') {
    return typeof session.answers === 'object' && Array.isArray(session.exclude)
  }
  if (session.name === 'show') {
    return (session.step === 0 || session.step === 1 || session.step === 2) && typeof session.draft === 'object'
  }
  if (session.name === 'show-results') {
    return typeof session.answers?.direction === 'string' && Array.isArray(session.exclude)
  }
  if (session.name === 'show-chosen') {
    return typeof session.answers?.direction === 'string' && Array.isArray(session.exclude) && typeof session.bookId === 'string'
  }
  return false
}

export function loadSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    return isSession(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function saveSession(session: Session): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
}
