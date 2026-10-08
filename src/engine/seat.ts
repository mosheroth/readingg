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

function askPhrase(answers: SeatAnswers): string {
  if (answers.seek === 'grip') return 'ביקשתם שיתפוס'
  if (answers.seek === 'feel') return 'ביקשתם שזה ייגע'
  if (answers.seek === 'lift') return 'ביקשתם משהו קל יותר'
  if (answers.seek === 'learn') return 'ביקשתם ללמוד משהו'
  if (answers.seek === 'weird') return 'ביקשתם שיפתיע'
  if (answers.heaviness === 'light' || answers.moment === 'afterHeavy') return 'ביקשתם משהו קל יותר'
  if (answers.heaviness === 'deep' || answers.heaviness === 'lasting' || answers.moment === 'challenge') return 'ביקשתם משקל'
  if (answers.origin === 'original') return 'ביקשתם ספרות מקור'
  if (answers.origin === 'translated') return 'ביקשתם ספר מתורגם'
  return 'לפי התשובות'
}

function formatRating(value: number): string {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

function alone<T>(books: DisputedBook[], value: T, read: (item: DisputedBook) => T): boolean {
  return books.filter((item) => read(item) === value).length === 1
}

function viaLine(book: DisputedBook, via: string[]): string | null {
  if (via.length === 1) return `מי שהמליץ על «${via[0]}» המליץ גם על «${book.title}»`
  if (via.length > 1) return `מי שהמליץ על «${via[0]}» ועל «${via[1]}» המליץ גם על «${book.title}»`
  return null
}

function pageLine(book: DisputedBook, books: DisputedBook[], answers: SeatAnswers): string | null {
  const pages = books.map((item) => item.pages).filter((item): item is number => item != null)
  const mine = book.pages
  if (mine == null || new Set(pages).size < 2 || !alone(books, mine, (item) => item.pages)) return null
  const shortest = Math.min(...pages)
  const longest = Math.max(...pages)
  const wantsLight = answers.seek === 'lift' || answers.heaviness === 'light' || answers.moment === 'afterHeavy'
  const wantsWeight = answers.heaviness === 'deep' || answers.heaviness === 'lasting' || answers.moment === 'challenge'
  const ask = askPhrase(answers)
  if (mine === shortest && answers.moment === 'returning') return `חוזרים אחרי הפסקה, וזה הקצר מבין השלושה: ${mine} עמודים`
  if (mine === shortest && wantsLight && ask !== 'ביקשתם משהו קל יותר') {
    return `ביקשתם משהו קל יותר, וזה הקצר מבין השלושה: ${mine} עמודים`
  }
  if (mine === longest && wantsWeight && !wantsLight && ask !== 'ביקשתם משקל') {
    return `ביקשתם משקל, וזה הארוך מבין השלושה: ${mine} עמודים`
  }
  if (mine === shortest) return `זה הקצר מבין השלושה: ${mine} עמודים`
  if (mine === longest) return `זה הארוך מבין השלושה: ${mine} עמודים`
  return `באורך ${mine} עמודים, בין השניים האחרים`
}

function shelfLine(book: DisputedBook, books: DisputedBook[]): string | null {
  const shelf = shelfOf(book).replace(/\s+/g, ' ').trim()
  if (!shelf || !alone(books, shelfOf(book), shelfOf)) return null
  return `זה היחיד כאן ממדף ${shelf}`
}

function matchesAsk(book: DisputedBook, answers: SeatAnswers): boolean {
  const shelf = shelfOf(book)
  const pages = book.pages ?? 320
  const literary = shelf.includes('ספרות')
  const light = shelf.includes('קלה') || shelf.includes('רומן')
  const ideas = (book.category !== '' && book.category !== 'ספרות') || shelf.includes('פסיכולוג')
  const ask = askPhrase(answers)
  if (ask === 'ביקשתם שיתפוס') return shelf.includes('מתח')
  if (ask === 'ביקשתם שזה ייגע') return literary || shelf.includes('חיים') || shelf.includes('ביוגר')
  if (ask === 'ביקשתם משהו קל יותר') return light || pages <= 280
  if (ask === 'ביקשתם ללמוד משהו') return ideas
  if (ask === 'ביקשתם שיפתיע') return shelf.includes('מדע') || shelf.includes('פנטז')
  if (ask === 'ביקשתם משקל') return literary && !light
  if (ask === 'ביקשתם ספרות מקור') return book.origin === 'original'
  if (ask === 'ביקשתם ספר מתורגם') return book.origin === 'translated'
  return false
}

function gapLine(book: DisputedBook, books: DisputedBook[]): string | null {
  const gapLabel = `${book.praise.rating} מול ${book.dissent.rating}`
  if (!alone(books, gapLabel, (item) => `${item.praise.rating} מול ${item.dissent.rating}`)) return null
  const gap = book.praise.rating - book.dissent.rating
  const gaps = books.map((item) => item.praise.rating - item.dissent.rating)
  return gap === Math.max(...gaps) ? `הוויכוח כאן החד מבין השלושה: ${gapLabel}` : `הביקורות כאן ${gapLabel}`
}

function ratingLine(book: DisputedBook, books: DisputedBook[]): string | null {
  if (book.avgRating == null || !alone(books, book.avgRating, (item) => item.avgRating)) return null
  const ratings = books.map((item) => item.avgRating).filter((item): item is number => item != null)
  const shown = formatRating(book.avgRating)
  return book.avgRating === Math.max(...ratings) ? `הציון הגבוה מבין השלושה בסימניה: ${shown}` : `בסימניה הציון שלו ${shown}`
}

function yearLine(book: DisputedBook, books: DisputedBook[]): string | null {
  if (!book.year || !alone(books, book.year, (item) => item.year)) return null
  return `היחיד שיצא ב־${book.year}`
}

function translatorLine(book: DisputedBook, books: DisputedBook[]): string | null {
  if (!book.translator || !alone(books, book.translator, (item) => item.translator)) return null
  return `בתרגום ${book.translator}`
}

function closeLine(book: DisputedBook, books: DisputedBook[], answers: SeatAnswers): string | null {
  const seed = seedById(answers.seedId)
  if (!seed || answers.direction !== 'similar') return null
  const scores = books.map((item) => contextScore(item, answers))
  const best = Math.max(...scores)
  if (scores.filter((score) => score === best).length !== 1) return null
  if (contextScore(book, answers) !== best) return null
  return `הכי קרוב ל«${seed.title}» מבין השלושה`
}

function contrastLines(book: DisputedBook, books: DisputedBook[], answers: SeatAnswers): string[] {
  return [
    closeLine(book, books, answers),
    pageLine(book, books, answers),
    shelfLine(book, books),
    gapLine(book, books),
    ratingLine(book, books),
    translatorLine(book, books),
    yearLine(book, books),
  ].filter((line): line is string => line != null)
}

function readerArgument(text: string): boolean {
  return text.startsWith('ביקשתם') || text.startsWith('חוזרים')
}

function reasonsForTrio(picks: { book: DisputedBook; via: string[] }[], answers: SeatAnswers): string[][] {
  const books = picks.map((pick) => pick.book)
  const ask = askPhrase(answers)
  const packs = picks.map((pick) => ({
    via: viaLine(pick.book, pick.via),
    contrasts: contrastLines(pick.book, books, answers),
  }))
  const askIndex = packs.findIndex((pack, index) => matchesAsk(books[index], answers) && !readerArgument(pack.contrasts[0] ?? ''))
  const drafts = packs.map((pack, index) => {
    const contrasts = [...pack.contrasts]
    const lines: string[] = []
    if (index === askIndex) {
      const shelf = contrasts.find((line) => line.startsWith('זה היחיד כאן ממדף'))
      const detail = shelf ?? contrasts.find((line) => !readerArgument(line))
      if (detail) {
        const at = contrasts.indexOf(detail)
        contrasts.splice(at, 1)
        lines.push(`${ask}. ${detail}`)
      } else lines.push(ask)
    }
    if (pack.via) lines.push(pack.via)
    for (const line of contrasts) {
      if (lines.length >= 3) break
      if (!lines.includes(line)) lines.push(line)
    }
    if (lines.length === 0) {
      const book = books[index]
      lines.push(`של ${book.author}, ${book.praise.rating} מול ${book.dissent.rating}`)
    }
    return lines.slice(0, 3)
  })
  const seen = new Set<string>()
  return drafts.map((list, index) => {
    const unique = list.filter((line) => {
      if (seen.has(line)) return false
      seen.add(line)
      return true
    })
    if (unique.length > 0) return unique
    const book = books[index]
    return [`של ${book.author}, ${book.praise.rating} מול ${book.dissent.rating}`]
  })
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
  const picks: { book: DisputedBook; via: string[] }[] = []

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
    picks.push({ book: winner.book, via: winner.via.slice(0, 2) })
  }
  const reasons = reasonsForTrio(picks, answers)
  return picks.map((pick, index) => ({
    book: pick.book,
    reasons: reasons[index] ?? [],
    praiseLead: firstSentence(descriptionLead(pick.book.praise.excerpt).lead),
    dissentLead: firstSentence(descriptionLead(pick.book.dissent.excerpt).lead),
  }))
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
