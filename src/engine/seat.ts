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

function cleanShelf(book: DisputedBook): string {
  return shelfOf(book).replace(/\s+/g, ' ').trim()
}

interface ReasonCandidate {
  index: number
  kind: string
  text: string
}

function lengthCandidate(books: DisputedBook[], answers: SeatAnswers): ReasonCandidate | null {
  const known = books.flatMap((book, index) => (book.pages == null ? [] : [{ index, pages: book.pages }]))
  if (known.length < 2 || new Set(known.map((item) => item.pages)).size < 2) return null
  const shortest = Math.min(...known.map((item) => item.pages))
  const longest = Math.max(...known.map((item) => item.pages))
  const wantsLight = answers.seek === 'lift' || answers.heaviness === 'light' || answers.moment === 'afterHeavy'
  const wantsWeight = answers.heaviness === 'deep' || answers.heaviness === 'lasting' || answers.moment === 'challenge'
  if (answers.moment === 'returning' || wantsLight) {
    if (shortest > 320) return null
    const index = known.find((item) => item.pages === shortest)?.index
    if (index == null) return null
    const text =
      answers.moment === 'returning'
        ? `חוזרים אחרי הפסקה, וזה ספר של ${shortest} עמודים`
        : `ביקשתם משהו קל יותר, וזה ספר של ${shortest} עמודים`
    return { index, kind: 'length', text }
  }
  if (wantsWeight && longest >= 320) {
    const index = known.find((item) => item.pages === longest)?.index
    if (index == null) return null
    return { index, kind: 'length', text: `ביקשתם משקל, וזה ספר של ${longest} עמודים` }
  }
  return null
}

function yearCandidate(books: DisputedBook[]): ReasonCandidate | null {
  const known = books.flatMap((book, index) => (book.year == null ? [] : [{ index, year: book.year }]))
  if (known.length < 3) return null
  let best: ReasonCandidate | null = null
  let bestGap = 0
  for (const item of known) {
    const gaps = known.filter((other) => other.index !== item.index).map((other) => item.year - other.year)
    const older = gaps.every((gap) => gap <= -10)
    const newer = gaps.every((gap) => gap >= 10)
    if (!older && !newer) continue
    const delta = Math.min(...gaps.map((gap) => Math.abs(gap)))
    if (delta <= bestGap) continue
    bestGap = delta
    best = {
      index: item.index,
      kind: 'year',
      text: older ? `יצא ב־${item.year}, ${delta} שנה לפני השניים האחרים` : `יצא ב־${item.year}, ${delta} שנה אחרי השניים האחרים`,
    }
  }
  return best
}

function crowdCandidate(books: DisputedBook[]): ReasonCandidate | null {
  const counts = books.map((book) => book.simaniaReviewCount)
  if (counts.some((count) => count == null)) return null
  const known = counts as number[]
  const max = Math.max(...known)
  if (known.filter((count) => count === max).length !== 1) return null
  const next = Math.max(...known.filter((count) => count !== max))
  if (max < next * 3 && max - next < 40) return null
  const index = known.indexOf(max)
  const book = books[index]
  const rating = book.avgRating
  const ratings = books.map((item) => item.avgRating).filter((item): item is number => item != null)
  const leads = rating != null && ratings.filter((item) => item === rating).length === 1 && rating === Math.max(...ratings)
  const count = max.toLocaleString('he-IL')
  const text = leads
    ? `${count} ביקורות בסימניה, והציון הגבוה כאן: ${formatRating(rating)}`
    : `${count} ביקורות בסימניה, הרבה יותר מהשניים האחרים`
  return { index, kind: 'crowd', text }
}

function reasonsForTrio(picks: { book: DisputedBook; via: string[] }[], answers: SeatAnswers): string[][] {
  const books = picks.map((pick) => pick.book)
  const ask = askPhrase(answers)
  const candidates: ReasonCandidate[] = []

  picks.forEach((pick, index) => {
    const via = viaLine(pick.book, pick.via)
    if (via) candidates.push({ index, kind: `via-${index}`, text: via })
  })

  const length = lengthCandidate(books, answers)
  if (length) candidates.push(length)
  const lengthCoversAsk = length != null && length.text.startsWith(ask)

  const askIndex = books.findIndex((book, index) => matchesAsk(book, answers) && !(lengthCoversAsk && index === length?.index))
  if (askIndex >= 0) {
    const book = books[askIndex]
    const shelf = cleanShelf(book)
    const uniqueShelf = Boolean(shelf) && alone(books, shelfOf(book), shelfOf)
    candidates.push({
      index: askIndex,
      kind: 'ask',
      text: uniqueShelf ? `${ask}, וזה היחיד כאן ממדף ${shelf}` : `${ask}, וזה הספר של ${book.author}`,
    })
  }

  const crowd = crowdCandidate(books)
  if (crowd) candidates.push(crowd)

  const ratings = books.map((book) => book.avgRating)
  const numeric = ratings.filter((item): item is number => item != null)
  if (numeric.length > 0 && !(crowd && crowd.text.includes('הציון הגבוה'))) {
    const best = Math.max(...numeric)
    if (ratings.filter((item) => item === best).length === 1) {
      const index = ratings.indexOf(best)
      candidates.push({ index, kind: 'score', text: `הציון הגבוה מבין השלושה בסימניה: ${formatRating(best)}` })
    }
  }

  const gaps = books.map((book) => book.praise.rating - book.dissent.rating)
  const sharpest = Math.max(...gaps)
  if (gaps.filter((gap) => gap === sharpest).length === 1) {
    const index = gaps.indexOf(sharpest)
    const book = books[index]
    candidates.push({
      index,
      kind: 'debate',
      text: `הוויכוח כאן החד מבין השלושה: ${book.praise.rating} מול ${book.dissent.rating}`,
    })
  }

  books.forEach((book, index) => {
    const shelf = cleanShelf(book)
    if (!shelf || !alone(books, shelfOf(book), shelfOf)) return
    if (candidates.some((item) => item.index === index && item.kind === 'ask' && item.text.includes(shelf))) return
    candidates.push({ index, kind: `shelf-${index}`, text: `זה היחיד כאן ממדף ${shelf}` })
  })

  const seed = seedById(answers.seedId)
  if (seed && answers.direction === 'similar') {
    const scores = books.map((book) => contextScore(book, answers))
    const best = Math.max(...scores)
    if (scores.filter((score) => score === best).length === 1) {
      candidates.push({
        index: scores.indexOf(best),
        kind: 'close',
        text: `הכי קרוב ל«${seed.title}» מבין השלושה`,
      })
    }
  }

  const translatorIndex = books.findIndex(
    (book, index) => book.translator && books.filter((item) => item.translator === book.translator).length === 1 && index >= 0,
  )
  if (translatorIndex >= 0) {
    candidates.push({ index: translatorIndex, kind: 'translator', text: `בתרגום ${books[translatorIndex].translator}` })
  }

  const year = yearCandidate(books)
  if (year) candidates.push(year)

  const rank = (kind: string) =>
    kind.startsWith('via') ? 0 : ['ask', 'crowd', 'debate', 'score', 'close', 'length', 'translator', 'year'].indexOf(kind) + 1 || 8
  const pending = [...candidates].sort((a, b) => rank(a.kind) - rank(b.kind) || a.index - b.index)
  const used = new Set<string>()
  const lines = books.map(() => [] as string[])
  for (let pass = 0; pass < 2; pass += 1) {
    for (let index = 0; index < books.length; index += 1) {
      if (lines[index].length > pass) continue
      const next = pending.find((item) => item.index === index && item.text && !used.has(item.kind) && !lines[index].includes(item.text))
      if (!next) continue
      used.add(next.kind)
      lines[index].push(next.text)
    }
  }
  return lines.map((list, index) => {
    if (list.length > 0) return list
    const book = books[index]
    return [`של ${book.author}, ביקורת של ${book.praise.rating} מול ${book.dissent.rating}`]
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
