import { books } from '../data/books'
import { openingLine, reasonChips } from '../data/labels'
import type { Answers, Book, Persona, Recommendation } from '../types'

export const personas: Persona[] = [
  {
    id: 'yael',
    name: 'יעל',
    role: 'בעד הלב',
    stance: 'ספר שאפשר לשבת איתו אחרי שסוגרים',
  },
  {
    id: 'tom',
    name: 'תום',
    role: 'בעד הקצב',
    stance: 'ספר שלא נותנים לו ליפול מהידיים',
  },
  {
    id: 'nadav',
    name: 'נדב',
    role: 'בעד הראש',
    stance: 'ספר שמשנה איך מסתכלים על משהו',
  },
]

const jabs: Record<Persona['id'], string> = {
  yael: 'אפשר לבחור משהו שרץ יותר. חבל. זה הספר שיישאר אחרי שהאחרים ייגמרו.',
  tom: 'יש על השולחן ספרים מכובדים יותר. אף אחד מהם לא יגרום לכם לאחר לישון.',
  nadav: 'אם בא לכם רק לברוח, זה לא זה. אם בא לכם להבין למה ברחתם, כן.',
}

function has(book: Book, genre: Book['genres'][number]): boolean {
  return book.genres.includes(genre)
}

function mood(book: Book, name: Book['moods'][number]): boolean {
  return book.moods.includes(name)
}

function theme(book: Book, name: Book['themes'][number]): boolean {
  return book.themes.includes(name)
}

export function baseScore(book: Book, answers: Answers): number {
  let score = 0

  if (answers.seek === 'grip') {
    if (book.pace === 'fast') score += 3
    if (book.pace === 'slow') score -= 2
    if (mood(book, 'suspense')) score += 3
    if (has(book, 'thriller') || has(book, 'mystery') || has(book, 'sf')) score += 2
  } else if (answers.seek === 'feel') {
    if (mood(book, 'tender')) score += 3
    if (has(book, 'literary') || has(book, 'memoir') || has(book, 'romance')) score += 2
    if (theme(book, 'love') || theme(book, 'family') || theme(book, 'loneliness')) score += 2
    if (mood(book, 'dark') && !mood(book, 'tender')) score -= 1
  } else if (answers.seek === 'lift') {
    if (mood(book, 'funny')) score += 3
    if (mood(book, 'hopeful')) score += 2
    if (book.weight === 'light') score += 2
    if (has(book, 'humor') || has(book, 'romance')) score += 2
    if (mood(book, 'dark')) score -= 2
    if (book.weight === 'heavy') score -= 2
  } else if (answers.seek === 'learn') {
    if (!book.fiction) score += 4
    if (theme(book, 'ideas')) score += 3
    if (has(book, 'memoir')) score += 1
    if (has(book, 'romance') && book.fiction) score -= 2
  } else if (answers.seek === 'weird') {
    if (mood(book, 'weird')) score += 4
    if (has(book, 'fantasy') || has(book, 'sf')) score += 2
    if (has(book, 'literary')) score += 1
    if (has(book, 'romance') && !mood(book, 'weird')) score -= 1
  }

  if (answers.heaviness === 'light') {
    if (book.weight === 'light') score += 3
    else if (book.weight === 'medium') score += 1
    else score -= 5
    if (book.length === 'long') score -= 2
    if (book.length === 'short') score += 1
  } else if (answers.heaviness === 'breathing') {
    if (book.weight === 'medium') score += 2
    if (book.weight === 'light') score += 1
    if (book.weight === 'heavy') score -= 2
  } else if (answers.heaviness === 'lasting') {
    if (book.weight === 'heavy') score += 2
    if (book.weight === 'medium') score += 1
    if (book.weight === 'light') score -= 1
  } else if (answers.heaviness === 'deep') {
    if (book.weight === 'heavy') score += 3
    if (book.length === 'long') score += 1
    if (book.weight === 'light') score -= 3
  }

  if (answers.moment === 'returning') {
    if (book.weight === 'light') score += 2
    if (book.length === 'short') score += 2
    if (book.pace === 'fast') score += 1
    if (book.weight === 'heavy') score -= 2
  } else if (answers.moment === 'afterHeavy') {
    if (book.weight === 'light') score += 2
    if (mood(book, 'hopeful')) score += 2
    if (book.weight === 'heavy') score -= 3
  } else if (answers.moment === 'challenge') {
    if (book.weight === 'heavy') score += 2
    if (book.length === 'long') score += 1
    if (has(book, 'literary') || has(book, 'nonfiction')) score += 1
  }

  if (answers.origin === 'israel') {
    score += book.origin === 'israel' ? 4 : -2
  } else if (answers.origin === 'world') {
    score += book.origin === 'world' ? 2 : -1
  }

  if (theme(book, answers.life)) score += 4
  if (answers.life === 'love' && has(book, 'romance')) score += 2
  if (answers.life === 'ideas' && !book.fiction) score += 2
  if (answers.life === 'society' && (mood(book, 'dark') || mood(book, 'sharp'))) score += 1

  if (answers.sofa === 'devour') {
    if (book.pace === 'fast') score += 3
    if (book.pace === 'slow') score -= 2
  } else if (answers.sofa === 'quiet') {
    if (mood(book, 'quiet')) score += 3
    if (book.pace === 'slow') score += 2
    if (book.pace === 'fast') score -= 1
    if (mood(book, 'suspense')) score -= 1
  } else if (answers.sofa === 'mystery') {
    if (has(book, 'mystery') || has(book, 'thriller') || mood(book, 'suspense')) score += 4
  } else if (answers.sofa === 'underline') {
    if (has(book, 'literary') || has(book, 'nonfiction')) score += 2
    if (theme(book, 'ideas')) score += 2
    if (book.pace === 'slow') score += 1
  }

  return score
}

function personaBoost(book: Book, persona: Persona): number {
  let score = 0
  if (persona.id === 'yael') {
    if (mood(book, 'tender')) score += 3
    if (mood(book, 'hopeful')) score += 1
    if (theme(book, 'love') || theme(book, 'family')) score += 2
    if (theme(book, 'loneliness')) score += 1
    if (has(book, 'literary') || has(book, 'romance') || has(book, 'memoir')) score += 2
    if (book.pace === 'slow') score += 1
    if (!book.fiction) score -= 2
    if (has(book, 'thriller')) score -= 1
  } else if (persona.id === 'tom') {
    if (book.pace === 'fast') score += 3
    if (book.pace === 'slow') score -= 3
    if (mood(book, 'suspense')) score += 2
    if (mood(book, 'funny')) score += 2
    if (has(book, 'thriller')) score += 3
    if (has(book, 'mystery') || has(book, 'humor')) score += 2
    if (has(book, 'sf') || has(book, 'romance')) score += 1
    if (book.weight === 'light') score += 2
    if (book.length === 'short') score += 1
    if (!book.fiction) score -= 3
  } else {
    if (!book.fiction) score += 3
    if (theme(book, 'ideas')) score += 3
    if (mood(book, 'weird') || mood(book, 'sharp')) score += 2
    if (has(book, 'literary')) score += 1
    if (book.weight === 'heavy') score += 1
    if (book.pace === 'slow') score += 1
    if (has(book, 'humor') || has(book, 'romance')) score -= 1
  }
  return score
}

function diversityPenalty(book: Book, chosen: Book[]): number {
  let penalty = 0
  for (const other of chosen) {
    if (other.author === book.author) penalty += 8
    if (other.genres[0] === book.genres[0]) penalty += 5
  }
  return penalty
}

export function pitchFor(persona: Persona, book: Book, answers: Answers): { pitch: string; jab: string } {
  const pitch = `${openingLine(answers)} ${persona.name} ${persona.id === 'yael' ? 'שמה' : 'שם'} על השולחן את «${book.title}». ${book.why}`
  return { pitch, jab: jabs[persona.id] }
}

export function recommend(answers: Answers, options?: { exclude?: string[] }): Recommendation[] {
  const excluded = new Set(options?.exclude ?? [])
  const pool = books.filter((book) => !excluded.has(book.id))
  const source = pool.length >= personas.length ? pool : books
  const chosen: Book[] = []
  const results: Recommendation[] = []

  for (const persona of personas) {
    const ranked = source
      .filter((book) => !chosen.some((pick) => pick.id === book.id))
      .map((book) => ({
        book,
        score: baseScore(book, answers) + personaBoost(book, persona) - diversityPenalty(book, chosen),
      }))
      .sort((a, b) => b.score - a.score || a.book.id.localeCompare(b.book.id, 'en'))
    const winner = ranked[0]
    if (!winner) continue
    chosen.push(winner.book)
    const { pitch, jab } = pitchFor(persona, winner.book, answers)
    results.push({
      persona,
      book: winner.book,
      score: winner.score,
      reasons: reasonChips(winner.book.themes, winner.book.origin, answers, winner.book.genres, winner.book.pace),
      pitch,
      jab,
    })
  }

  return results
}
