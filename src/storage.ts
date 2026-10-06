import { bookById } from './data/books'
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

export type Session =
  | { name: 'intro' }
  | { name: 'quiz'; step: number; answers: Partial<Answers> }
  | { name: 'results'; answers: Answers; exclude: string[] }
  | { name: 'chosen'; answers: Answers; exclude: string[]; bookId: string; personaId: string }

export function loadShelf(): ShelfItem[] {
  try {
    const raw = localStorage.getItem(SHELF_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ShelfItem[]
    return Array.isArray(parsed) ? parsed.filter((item) => bookById(item.bookId)) : []
  } catch {
    return []
  }
}

export function saveChoice(rec: Recommendation): ShelfItem[] {
  const next: ShelfItem = {
    bookId: rec.book.id,
    personaId: rec.persona.id,
    personaName: rec.persona.name,
    title: rec.book.title,
    author: rec.book.author,
    chosenAt: Date.now(),
  }
  const shelf = [next, ...loadShelf().filter((item) => item.bookId !== next.bookId)].slice(0, 12)
  localStorage.setItem(SHELF_KEY, JSON.stringify(shelf))
  return shelf
}

export function loadSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Session
  } catch {
    return null
  }
}

export function saveSession(session: Session): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
}
