import { proseLabel, readingOf, worldLabel, worldsPhrase, type BookReading } from '../data/readings'
import type { Heaviness, Life, Moment, Seek, Sofa } from '../types'
import { arguedBooks, bookByTableId, contextScore, descriptionLead, poolFor, seedById, type Direction, type DisputedBook, type OriginChoice } from './table'

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
  about: string
  proseNote: string
  tags: string[]
  viaNote: string | null
  /** 0–100. How many of the questionnaire asks this book meets. */
  fit: number
}

interface ViaLink {
  title: string
  reviewer: string
  where: 'earlier' | 'here'
}

function shelfOf(book: DisputedBook): string {
  return book.subcategory || book.category
}

const wantedProse: Record<Heaviness, BookReading['prose']> = {
  light: 1,
  breathing: 2,
  lasting: 3,
  deep: 4,
}

function tasteScore(book: DisputedBook, answers: SeatAnswers): number {
  const reading = readingOf(book.id)
  if (!reading) return 0
  const want = wantedProse[answers.heaviness]
  const distance = Math.abs(reading.prose - want)
  let score = (3 - distance) * 8
  if (answers.moment === 'returning' || answers.moment === 'afterHeavy') {
    if (reading.prose <= 2) score += 10
    else if (reading.prose === 4) score -= 12
  }
  if (answers.moment === 'challenge' && reading.prose >= 3) score += 10
  if (answers.moment === 'challenge' && reading.prose === 1) score -= 6
  if (reading.worlds.some((world) => world === answers.life)) score += 18
  if (reading.pull === answers.seek) score += 16
  if (answers.seek === 'grip' && reading.worlds.includes('suspense')) score += 8
  if (answers.seek === 'weird' && reading.worlds.includes('strange')) score += 8
  if (answers.sofa === 'devour' && reading.prose <= 2) score += 6
  if (answers.sofa === 'quiet' && (reading.pull === 'feel' || reading.prose === 2)) score += 6
  if (answers.sofa === 'mystery' && reading.worlds.includes('suspense')) score += 12
  if (answers.sofa === 'underline' && (reading.prose >= 3 || reading.pull === 'learn')) score += 8
  return score
}

function momentFit(reading: BookReading, answers: SeatAnswers): number {
  if (answers.moment === 'regular') return 10
  if (answers.moment === 'returning' || answers.moment === 'afterHeavy') {
    if (reading.prose <= 2) return 10
    if (reading.prose === 3) return 4
    return 0
  }
  if (reading.prose >= 3) return 10
  if (reading.prose === 2) return 4
  return 0
}

function sofaFit(reading: BookReading, answers: SeatAnswers): number {
  if (answers.sofa === 'devour') {
    if (reading.prose <= 2) return 10
    if (reading.prose === 3) return 4
    return 0
  }
  if (answers.sofa === 'quiet') return reading.pull === 'feel' || reading.prose === 2 || reading.prose === 3 ? 10 : 0
  if (answers.sofa === 'mystery') return reading.worlds.includes('suspense') ? 10 : 0
  return reading.prose >= 3 || reading.pull === 'learn' ? 10 : 0
}

/** How much of the questionnaire this book meets, from 0 to 100. Not a Simania rating. */
export function fitEstimate(book: DisputedBook, answers: SeatAnswers): number {
  const reading = readingOf(book.id)
  if (!reading) return 0
  const distance = Math.min(3, Math.abs(reading.prose - wantedProse[answers.heaviness]))
  const prose = [30, 18, 8, 0][distance]
  const life = reading.worlds.some((world) => world === answers.life) ? 25 : 0
  const seek = reading.pull === answers.seek ? 25 : 0
  return prose + life + seek + momentFit(reading, answers) + sofaFit(reading, answers)
}

function linkedFrom(bookId: string, shown: DisputedBook[], chosen: DisputedBook[]): ViaLink[] {
  const links: ViaLink[] = []
  const scan = (anchors: DisputedBook[], where: ViaLink['where']) => {
    for (const anchor of anchors) {
      if (anchor.id === bookId || links.some((link) => link.title === anchor.title)) continue
      const person = anchor.advocates.find((advocate) => advocate.also.some((item) => item.id === bookId))
      if (!person) continue
      links.push({ title: anchor.title, reviewer: person.reviewer, where })
    }
  }
  scan(shown, 'earlier')
  scan(chosen, 'here')
  return links
}

function viaNote(link: ViaLink | undefined): string | null {
  if (!link) return null
  const place = link.where === 'earlier' ? 'מהשלושה הקודמים' : 'שנמצא כאן בין השלושה'
  return `${link.reviewer} המליץ לחיוב על «${link.title}», ${place}, וגם על הספר הזה.`
}

const pullLine: Record<Seek, string> = {
  grip: 'ביקשתם שיתפוס, וזה נבנה כך',
  feel: 'ביקשתם שזה ייגע, והעולם כאן רגשי',
  lift: 'ביקשתם שירים, ויש כאן חום',
  learn: 'ביקשתם ללמוד משהו, וזה ספר שמסביר',
  weird: 'ביקשתם שיפתיע, והעולם כאן לא שגרתי',
}

function proseFit(reading: BookReading, answers: SeatAnswers): string {
  const here = proseLabel[reading.prose]
  const asked = proseLabel[wantedProse[answers.heaviness]]
  return here === asked ? `ביקשתם כתיבה ${asked}, וזו בדיוק הכתיבה כאן` : `ביקשתם כתיבה ${asked}, וכאן היא ${here}`
}

function giveToEmptiest(lines: string[][], candidates: number[], text: string) {
  const open = candidates.filter((index) => lines[index].length < 2)
  if (open.length === 0) return
  const index = [...open].sort((a, b) => lines[a].length - lines[b].length || a - b)[0]
  if (!lines[index].includes(text)) lines[index].push(text)
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

function reasonsForTrio(picks: { book: DisputedBook }[], answers: SeatAnswers): string[][] {
  const books = picks.map((pick) => pick.book)
  const readings = books.map((book) => readingOf(book.id))
  const lines = books.map(() => [] as string[])
  readings.forEach((mine, index) => {
    if (!mine || lines[index].length >= 2) return
    const unique = mine.worlds.find(
      (world) => world !== answers.life && readings.every((reading, other) => other === index || !reading?.worlds.includes(world)),
    )
    if (unique) lines[index].push(`מבין השלושה, רק כאן זה נוגע ב${worldLabel[unique]}`)
  })
  const lifeHits = readings.flatMap((reading, index) => (reading?.worlds.some((world) => world === answers.life) ? [index] : []))
  if (lifeHits.length > 0) giveToEmptiest(lines, lifeHits, `נוגע ב${worldLabel[answers.life]}, וזה מה שתופס אתכם עכשיו`)
  const want = wantedProse[answers.heaviness]
  const distance = (index: number) => {
    const reading = readings[index]
    return reading ? Math.abs(reading.prose - want) : 99
  }
  const best = Math.min(...books.map((_, index) => distance(index)))
  const closest = books.flatMap((_, index) => (distance(index) === best ? [index] : []))
  if (closest.length === 1 && best <= 1 && readings[closest[0]]) {
    giveToEmptiest(lines, closest, proseFit(readings[closest[0]]!, answers))
  }
  const pullHits = readings.flatMap((reading, index) => (reading?.pull === answers.seek ? [index] : []))
  if (pullHits.length > 0) giveToEmptiest(lines, pullHits, pullLine[answers.seek])
  books.forEach((book, index) => {
    if (lines[index].length > 0) return
    const close = closeLine(book, books, answers)
    if (close) lines[index].push(close)
  })
  if (closest.length > 1 && best <= 1) {
    const empty = closest.filter((index) => lines[index].length === 0 && readings[index])
    if (empty.length === 1) lines[empty[0]].push(proseFit(readings[empty[0]]!, answers))
  }
  books.forEach((_, index) => {
    if (lines[index].length > 0) return
    const reading = readings[index]
    lines[index].push(reading ? `נוגע ב${worldLabel[reading.worlds[0]]}` : `של ${books[index].author}`)
  })
  const seen = new Set<string>()
  return lines.map((list, index) => {
    const unique = list.filter((line) => {
      if (seen.has(line)) return false
      seen.add(line)
      return true
    }).slice(0, 2)
    if (unique.length > 0) return unique
    const reading = readings[index]
    return [reading ? reading.about : `של ${books[index].author}`]
  })
}

/** A review quote stays inside two lines. The ellipsis is part of the budget. */
export const REVIEW_MAX = 80

export function firstSentence(text: string, max = 160): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  if (!flat) return ''
  const stop = flat.search(/[.!?]/)
  const sentence = stop >= 40 ? flat.slice(0, stop + 1) : flat
  if (sentence.length <= max) return sentence
  const cut = sentence.slice(0, max - 1)
  const space = cut.lastIndexOf(' ')
  return `${(space > 40 ? cut.slice(0, space) : cut).trim()}…`
}

const INDIRECT_BOOST = 36
/** An explicit search outranks taste, context, and a Simania cross-recommendation. */
const THEME_BOOST = 200

function searchedThemes(bookId: string, themes: string[]): string[] {
  const reading = readingOf(bookId)
  if (!reading || themes.length === 0) return []
  return themes.filter((theme) => reading.themes.includes(theme))
}

export function seatThree(answers: SeatAnswers, exclude: string[] = [], themes: string[] = []): Seat[] {
  const banned = new Set(exclude)
  if (answers.seedId) banned.add(answers.seedId)
  const pool = poolFor(answers.origin, banned)
  const source = pool.length >= 3 ? pool : arguedBooks.filter((book) => !banned.has(book.id))
  const shown = arguedBooks.filter((book) => exclude.includes(book.id))
  const chosen: DisputedBook[] = []
  const picks: { book: DisputedBook; via: ViaLink | null }[] = []

  for (let index = 0; index < 3; index += 1) {
    const ranked = source
      .filter((book) => !chosen.some((pick) => pick.id === book.id))
      .map((book) => {
        const via = linkedFrom(book.id, shown, chosen)
        const sameShelf = answers.direction !== 'similar' && chosen.some((pick) => shelfOf(pick) === shelfOf(book))
        const themeHits = searchedThemes(book.id, themes).length
        return {
          book,
          via,
          score:
            contextScore(book, answers) +
            tasteScore(book, answers) +
            via.length * INDIRECT_BOOST +
            themeHits * THEME_BOOST -
            (sameShelf ? 8 : 0),
        }
      })
      .sort((a, b) => b.score - a.score || a.book.id.localeCompare(b.book.id))
    const winner = ranked[0]
    if (!winner) break
    chosen.push(winner.book)
    picks.push({ book: winner.book, via: winner.via[0] ?? null })
  }
  const reasons = reasonsForTrio(picks, answers)
  return picks.map((pick, index) => {
    const reading = readingOf(pick.book.id)
    const searched = searchedThemes(pick.book.id, themes).map((theme) => `חיפשתם \u2067#${theme}\u2069`)
    return {
      book: pick.book,
      reasons: [...searched, ...(reasons[index] ?? [])],
      praiseLead: firstSentence(descriptionLead(pick.book.praise.excerpt).lead, REVIEW_MAX),
      dissentLead: firstSentence(descriptionLead(pick.book.dissent.excerpt).lead, REVIEW_MAX),
      about: reading?.about ?? firstSentence(descriptionLead(pick.book.description).lead),
      proseNote: reading ? `הכתיבה ${proseLabel[reading.prose]}. נוגע ב${worldsPhrase(reading.worlds)}.` : '',
      tags: reading?.themes ?? [],
      viaNote: viaNote(pick.via ?? undefined),
      fit: fitEstimate(pick.book, answers),
    }
  })
}

export function themeReason(theme: string): string {
  return `עוד ספר עם \u2067#${theme}\u2069`
}

export function describeSeat(book: DisputedBook, answers: SeatAnswers, reason: string): Seat {
  const reading = readingOf(book.id)
  return {
    book,
    reasons: [reason],
    praiseLead: firstSentence(descriptionLead(book.praise.excerpt).lead, REVIEW_MAX),
    dissentLead: firstSentence(descriptionLead(book.dissent.excerpt).lead, REVIEW_MAX),
    about: reading?.about ?? firstSentence(descriptionLead(book.description).lead),
    proseNote: reading ? `הכתיבה ${proseLabel[reading.prose]}. נוגע ב${worldsPhrase(reading.worlds)}.` : '',
    tags: reading?.themes ?? [],
    viaNote: null,
    fit: fitEstimate(book, answers),
  }
}

/** A book from the trio keeps its own reasons. A book reached by a theme gets one line. */
export function seatForBook(bookId: string, answers: SeatAnswers, among: Seat[], theme: string | null = null): Seat | null {
  const seated = among.find((seat) => seat.book.id === bookId)
  if (seated) return seated
  const book = bookByTableId(bookId)
  if (!book) return null
  const reading = readingOf(book.id)
  const fromClick = theme && reading?.themes.includes(theme) ? theme : null
  const fromTable = reading?.themes.find((item) => among.some((seat) => seat.tags.includes(item))) ?? null
  const picked = fromClick ?? fromTable
  const reason = picked ? themeReason(picked) : (reading?.about ?? book.title)
  return describeSeat(book, answers, reason)
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

export function seatSummary(answers: SeatAnswers, themes: string[] = []): string {
  const seed = seedById(answers.seedId)
  const head = seed ? `אחרי «${seed.title}»` : 'בלי ספר אחרון'
  const base = `${head} · ${directionText[answers.direction]} · ${seekText[answers.seek]} · ${originText[answers.origin]}`
  if (themes.length === 0) return base
  return `${base} · ${themes.map((theme) => `#${theme}`).join(' · ')}`
}
