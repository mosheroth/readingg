import { arguedBooks, contextScore, descriptionLead, poolFor, seedById, type Direction, type DisputedBook, type OriginChoice } from './table'
import type { Heaviness, Life, Moment, Seek, Sofa } from '../types'

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
  const ideas = (book.category !== '' && book.category !== 'ספרות') || shelf.includes('פסיכולוג')
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

function linkedFrom(bookId: string, anchors: DisputedBook[]): string[] {
  const titles: string[] = []
  for (const anchor of anchors) {
    if (anchor.id === bookId) continue
    const linked = anchor.advocates.some((person) => person.also.some((item) => item.id === bookId))
    if (linked && !titles.includes(anchor.title)) titles.push(anchor.title)
  }
  return titles
}

function fitReasons(book: DisputedBook, answers: SeatAnswers, via: string[]): string[] {
  const reasons: string[] = []
  const shelf = shelfOf(book)
  const pages = book.pages
  const seed = seedById(answers.seedId)
  const thriller = shelf.includes('מתח')
  const speculative = shelf.includes('מדע') || shelf.includes('פנטז')
  const literary = shelf.includes('ספרות')
  const light = shelf.includes('קלה') || shelf.includes('רומן')
  const ideas = (book.category !== '' && book.category !== 'ספרות') || shelf.includes('פסיכולוג')
  const lifeStory = shelf.includes('חיים') || shelf.includes('ביוגר')
  const wantsLight = answers.seek === 'lift' || answers.heaviness === 'light' || answers.moment === 'afterHeavy'
  const wantsWeight = answers.heaviness === 'deep' || answers.heaviness === 'lasting' || answers.moment === 'challenge'
  const wantsLearn = answers.seek === 'learn' || answers.life === 'ideas' || answers.sofa === 'underline'
  const wantsFeel = answers.seek === 'feel' || answers.life === 'love' || answers.life === 'family' || answers.life === 'loneliness'

  if ((answers.seek === 'grip' || answers.sofa === 'devour' || answers.sofa === 'mystery') && thriller) {
    reasons.push(`ביקשתם שיתפוס, וזה ${shelf}`)
  }
  if (wantsFeel && (literary || lifeStory)) reasons.push(`ביקשתם שזה ייגע, וזה ${shelf}`)
  if (wantsLight && (light || (pages != null && pages <= 280))) {
    reasons.push(pages != null && pages <= 280 ? `ביקשתם משהו קל יותר, ויש כאן ${pages} עמודים` : `ביקשתם משהו קל יותר, וזה ${shelf}`)
  }
  const learned = book.category || shelf
  if (wantsLearn && ideas && learned) reasons.push(`ביקשתם ללמוד משהו, וזה ${learned}`)
  if (answers.seek === 'weird' && speculative) reasons.push(`ביקשתם שיפתיע, וזה ${shelf}`)
  if (wantsWeight && literary && !light) reasons.push(`ביקשתם משקל, וזה ${shelf}`)
  if (answers.moment === 'returning' && (pages == null || pages < 360)) reasons.push('חזרה אחרי הפסקה, וזה ספר שאפשר להיכנס אליו')

  if (seed && answers.direction === 'similar' && seed.subcategory && book.subcategory === seed.subcategory) {
    reasons.push(`אותו מדף כמו «${seed.title}»`)
  } else if (seed && answers.direction === 'similar' && seed.category && book.category === seed.category) {
    reasons.push(`אותה קטגוריה כמו «${seed.title}»`)
  } else if (seed && answers.direction === 'different' && seed.category && book.category === seed.category && book.subcategory !== seed.subcategory) {
    reasons.push(`נשאר ב${book.category}, מחוץ למדף של «${seed.title}»`)
  } else if (seed && answers.direction === 'surprise' && seed.category && book.category && book.category !== seed.category) {
    reasons.push(`יוצא מהעולם של «${seed.title}»`)
  } else if (!seed && (answers.direction === 'different' || answers.direction === 'surprise')) {
    reasons.push(`הפער בין הביקורת הטובה (${book.praise.rating}) לרעה (${book.dissent.rating}) כאן חד`)
  }

  if (answers.origin === 'original' && book.origin === 'original') reasons.push('ביקשתם ספרות מקור')
  if (answers.origin === 'translated' && book.origin === 'translated') reasons.push('ביקשתם ספר מתורגם')
  if (via.length === 1) reasons.push(`מי שהמליץ על «${via[0]}» המליץ גם על הספר הזה`)
  else if (via.length > 1) reasons.push(`מי שהמליץ על «${via[0]}» ועל «${via[1]}» המליץ גם על הספר הזה`)

  const unique = [...new Set(reasons)]
  if (unique.length === 0) unique.push('מול התשובות שלכם זה הספר עם הציון הגבוה שנשאר')
  return unique.slice(0, 4)
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

const INDIRECT_BOOST = 36

export function seatThree(answers: SeatAnswers, exclude: string[] = []): Seat[] {
  const banned = new Set(exclude)
  if (answers.seedId) banned.add(answers.seedId)
  const pool = poolFor(answers.origin, banned)
  const source = pool.length >= 3 ? pool : arguedBooks.filter((book) => !banned.has(book.id))
  const shown = arguedBooks.filter((book) => exclude.includes(book.id))
  const chosen: DisputedBook[] = []
  const seats: Seat[] = []

  for (let index = 0; index < 3; index += 1) {
    const extra = exclude.length > 0 || index > 0
    const anchors = extra ? [...shown, ...chosen] : []
    const ranked = source
      .filter((book) => !chosen.some((pick) => pick.id === book.id))
      .map((book) => {
        const via = linkedFrom(book.id, anchors)
        const sameShelf = answers.direction !== 'similar' && chosen.some((pick) => shelfOf(pick) === shelfOf(book))
        return {
          book,
          via,
          score: contextScore(book, answers) + tasteScore(book, answers) + via.length * INDIRECT_BOOST - (sameShelf ? 8 : 0),
        }
      })
      .sort((a, b) => b.score - a.score || a.book.id.localeCompare(b.book.id))
    const winner = ranked[0]
    if (!winner) break
    chosen.push(winner.book)
    seats.push({
      book: winner.book,
      reasons: fitReasons(winner.book, answers, winner.via.slice(0, 2)),
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
