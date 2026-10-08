import { personas } from './recommend'
import { arguedBooks, contextScore, descriptionLead, poolFor, seedById, type Direction, type DisputedBook, type OriginChoice } from './table'
import type { Heaviness, Life, Moment, Persona, Seek, Sofa } from '../types'

export interface SeatAnswers {
  seedId: string | null
  direction: Direction
  seek: Seek
  heaviness: Heaviness
  moment: Moment
  life: Life
  sofa: Sofa
  origin: OriginChoice
}

export interface Seat {
  persona: Persona
  book: DisputedBook
  reasons: string[]
  praiseLead: string
  dissentLead: string
}

function shelfOf(book: DisputedBook): string {
  return book.subcategory || book.category
}

function tasteScore(book: DisputedBook, answers: SeatAnswers): number {
  const shelf = shelfOf(book)
  const pages = book.pages ?? 320
  const thriller = shelf.includes('מתח')
  const speculative = shelf.includes('מדע') || shelf.includes('פנטז')
  const literary = shelf.includes('ספרות')
  const light = shelf.includes('קלה') || shelf.includes('רומן')
  const ideas = book.category !== 'ספרות' || shelf.includes('פסיכולוג')
  const lifeStory = shelf.includes('חיים') || shelf.includes('ביוגר')
  let score = 0

  if (answers.seek === 'grip' || answers.sofa === 'devour' || answers.sofa === 'mystery') {
    if (thriller) score += 8
    if (speculative) score += 3
    if (pages > 480) score -= 2
  }
  if (answers.seek === 'feel' || answers.life === 'love' || answers.life === 'family' || answers.life === 'loneliness') {
    if (literary || lifeStory) score += 6
    if (thriller) score -= 2
  }
  if (answers.seek === 'lift' || answers.heaviness === 'light' || answers.moment === 'afterHeavy') {
    if (light) score += 6
    if (pages <= 280) score += 3
    if (pages > 450) score -= 3
  }
  if (answers.seek === 'learn' || answers.life === 'ideas' || answers.sofa === 'underline') {
    if (ideas) score += 8
  }
  if (answers.seek === 'weird') {
    if (speculative) score += 8
    if (literary) score += 1
  }
  if (answers.heaviness === 'deep' || answers.heaviness === 'lasting' || answers.moment === 'challenge') {
    if (literary) score += 4
    if (pages >= 320) score += 2
    if (light) score -= 3
  }
  if (answers.life === 'work' && ideas) score += 3
  if (answers.life === 'society' && (ideas || literary)) score += 3
  if (answers.moment === 'returning') {
    if (pages < 360) score += 3
    if (thriller || light) score += 2
  }
  if (answers.sofa === 'quiet' && literary) score += 3
  return score
}

function personaBoost(book: DisputedBook, persona: Persona): number {
  const shelf = shelfOf(book)
  const pages = book.pages ?? 320
  if (persona.id === 'yael') {
    let score = 0
    if (shelf === 'ספרות מקורית' || shelf.includes('חיים')) score += 8
    if (shelf.includes('מתח')) score -= 4
    if (book.category === 'עיון') score -= 2
    return score
  }
  if (persona.id === 'tom') {
    let score = 0
    if (shelf.includes('מתח') || shelf.includes('מדע') || shelf.includes('קלה')) score += 8
    if (pages < 340) score += 3
    if (book.category === 'עיון') score -= 5
    return score
  }
  let score = 0
  if (book.category !== 'ספרות') score += 6
  if (book.category === 'עיון' || book.category === 'פסיכולוגיה' || shelf.includes('קלאס')) score += 4
  if (shelf.includes('קלה')) score -= 4
  return score
}

function reasonsFor(book: DisputedBook, answers: SeatAnswers): string[] {
  const seed = seedById(answers.seedId)
  const reasons: string[] = []
  if (seed && answers.direction === 'similar' && seed.subcategory && book.subcategory === seed.subcategory) reasons.push('אותו מדף')
  if (book.origin === 'original') reasons.push('מקור')
  else if (book.origin === 'translated') reasons.push('תרגום')
  const shelf = shelfOf(book)
  if (shelf && !reasons.includes(shelf)) reasons.push(shelf)
  return reasons.slice(0, 3)
}

export function firstSentence(text: string, max = 160): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  if (!flat) return ''
  const stop = flat.search(/[.!?]/)
  const sentence = stop >= 40 ? flat.slice(0, stop + 1) : flat
  if (sentence.length <= max) return sentence
  const cut = sentence.slice(0, max)
  const space = cut.lastIndexOf(' ')
  return `${(space > 40 ? cut.slice(0, space) : cut).trim()}…`
}

export function seatThree(answers: SeatAnswers, exclude: string[] = []): Seat[] {
  const banned = new Set(exclude)
  if (answers.seedId) banned.add(answers.seedId)
  const pool = poolFor(answers.origin, banned)
  const source = pool.length >= personas.length ? pool : arguedBooks.filter((book) => !banned.has(book.id))
  const chosen: DisputedBook[] = []
  const seats: Seat[] = []

  for (const persona of personas) {
    const ranked = source
      .filter((book) => !chosen.some((pick) => pick.id === book.id))
      .map((book) => ({
        book,
        score: contextScore(book, answers) + tasteScore(book, answers) + personaBoost(book, persona),
      }))
      .sort((a, b) => b.score - a.score || a.book.id.localeCompare(b.book.id))
    const winner = ranked[0]
    if (!winner) continue
    chosen.push(winner.book)
    seats.push({
      persona,
      book: winner.book,
      reasons: reasonsFor(winner.book, answers),
      praiseLead: firstSentence(descriptionLead(winner.book.praise.excerpt).lead),
      dissentLead: firstSentence(descriptionLead(winner.book.dissent.excerpt).lead),
    })
  }
  return seats
}

const directionText: Record<Direction, string> = {
  similar: 'עוד מאותו עולם',
  different: 'כיוון אחר',
  surprise: 'הפתעה',
}

const seekText = {
  grip: 'שתתפוס',
  feel: 'שייגע',
  lift: 'שירים',
  learn: 'שילמד',
  weird: 'שיפתיע',
} as const

const originText = { original: 'מקור', translated: 'תרגום', either: 'מכל מקום' } as const

export function seatSummary(answers: SeatAnswers): string {
  const seed = seedById(answers.seedId)
  const head = seed ? `אחרי «${seed.title}»` : 'בלי ספר אחרון'
  return `${head} · ${directionText[answers.direction]} · ${seekText[answers.seek]} · ${originText[answers.origin]}`
}
