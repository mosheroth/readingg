import type { Seat, SeatAnswers } from './engine/seat'
import type { Direction } from './engine/table'
import type { Heaviness, Life, Moment, Seek, Sofa } from './types'

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

export interface SeatDraft {
  seedId: string | null
  direction?: Direction
  seek?: Seek
  heaviness?: Heaviness
  moment?: Moment
  life?: Life
  sofa?: Sofa
}

export type Session =
  | { name: 'intro' }
  | { name: 'quiz'; step: number; draft: SeatDraft }
  | { name: 'results'; answers: SeatAnswers; exclude: string[] }
  | { name: 'chosen'; answers: SeatAnswers; exclude: string[]; bookId: string; personaId: string }

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

export function saveSeat(seat: Seat): ShelfItem[] {
  return writeShelf({
    bookId: seat.book.id,
    personaId: 'table',
    personaName: '',
    title: seat.book.title,
    author: seat.book.author,
    chosenAt: Date.now(),
  })
}

function isSeatAnswers(value: unknown): value is SeatAnswers {
  if (!value || typeof value !== 'object') return false
  const answers = value as SeatAnswers
  return (
    (typeof answers.seedId === 'string' || answers.seedId === null) &&
    typeof answers.direction === 'string' &&
    typeof answers.seek === 'string' &&
    typeof answers.heaviness === 'string' &&
    typeof answers.moment === 'string' &&
    typeof answers.life === 'string' &&
    typeof answers.sofa === 'string' &&
    typeof answers.origin === 'string'
  )
}

function isSession(value: unknown): value is Session {
  if (!value || typeof value !== 'object') return false
  const session = value as Session
  if (session.name === 'intro') return true
  if (session.name === 'quiz') {
    return session.step >= 0 && session.step <= 7 && typeof session.draft === 'object' && session.draft !== null
  }
  if (session.name === 'results') return isSeatAnswers(session.answers) && Array.isArray(session.exclude)
  if (session.name === 'chosen') {
    return (
      isSeatAnswers(session.answers) &&
      Array.isArray(session.exclude) &&
      typeof session.bookId === 'string' &&
      typeof session.personaId === 'string'
    )
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
