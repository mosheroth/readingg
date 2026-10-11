import { describe, expect, it } from 'vitest'
import { boardDefaults, seatFromBoard } from '../board'
import { booksSharingTheme, readingOf } from '../data/readings'
import { arguedBooks, bookByTableId, catalogSeeds } from './table'
import { describeSeat, fitEstimate, firstSentence, seatForBook, seatThree, themeReason, type SeatAnswers } from './seat'

const base: SeatAnswers = {
  seedId: null,
  direction: 'surprise',
  seek: 'learn',
  heaviness: 'deep',
  moment: 'challenge',
  life: 'ideas',
  sofa: 'underline',
  origin: 'translated',
}

describe('seatThree', () => {
  it('does not claim a request that was never made', () => {
    const lines = seatThree(seatFromBoard(boardDefaults)).flatMap((seat) => seat.reasons)
    expect(lines.some((line) => line.includes('ביקשתם') || line.includes('תופס אתכם'))).toBe(false)
  })

  it('lifts every book of a searched theme onto the table', () => {
    const seats = seatThree(seatFromBoard(boardDefaults), [], ['חתונה'])
    expect(seats.map((seat) => seat.book.id).sort()).toEqual(['1008917', '1014685', '1025563'])
    expect(seats.every((seat) => seat.reasons[0] === 'חיפשתם \u2067#חתונה\u2069')).toBe(true)
  })

  it('offers three different books and says why each one fits', () => {
    const seats = seatThree(base)
    expect(seats).toHaveLength(3)
    expect(new Set(seats.map((seat) => seat.book.id)).size).toBe(3)
    expect(seats.every((seat) => seat.book.origin === 'translated')).toBe(true)
    expect(seats.every((seat) => seat.reasons.length > 0 && seat.reasons.length <= 3)).toBe(true)
    const lines = seats.flatMap((seat) => seat.reasons)
    expect(new Set(lines).size).toBe(lines.length)
    expect(seats.every((seat) => seat.praiseLead.length > 20 && seat.dissentLead.length > 10)).toBe(true)
    expect(seatThree(base).map((seat) => seat.book.id)).toEqual(seats.map((seat) => seat.book.id))
  })

  it('stays with Hebrew books when the last one was, and skips that book', () => {
    const seed = catalogSeeds.find(
      (item) => item.subcategory === 'ספרות מקורית' && !arguedBooks.some((book) => book.id === item.id),
    )
    expect(seed).toBeTruthy()
    const seats = seatThree({
      ...base,
      seedId: seed!.id,
      direction: 'similar',
      seek: 'feel',
      life: 'family',
      sofa: 'quiet',
      origin: 'original',
    })
    expect(seats.every((seat) => seat.book.origin === 'original')).toBe(true)
    expect(seats.some((seat) => seat.book.subcategory === 'ספרות מקורית')).toBe(true)
    expect(seats.some((seat) => seat.book.id === seed!.id)).toBe(false)
    const lines = seats.flatMap((seat) => seat.reasons)
    expect(new Set(lines).size).toBe(lines.length)
    expect(lines.filter((line) => line.includes('ביקשתם שזה ייגע')).length).toBeLessThanOrEqual(1)
  })

  it('offers another three that were not already seated', () => {
    const first = seatThree(base)
    const next = seatThree(
      base,
      first.map((seat) => seat.book.id),
    )
    expect(next).toHaveLength(3)
    expect(next.every((seat) => !first.some((item) => item.book.id === seat.book.id))).toBe(true)
    const poolIds = new Set(
      arguedBooks.filter((book) => book.origin === 'translated' && !first.some((seat) => seat.book.id === book.id)).map((book) => book.id),
    )
    const hasLink = first.some((seat) => seat.book.advocates.some((person) => person.also.some((item) => poolIds.has(item.id))))
    if (hasLink) expect(next.some((seat) => seat.viaNote?.includes('מהשלושה הקודמים'))).toBe(true)
  })

  it('keeps a stored reading for every disputed book', () => {
    for (const book of arguedBooks) {
      const reading = readingOf(book.id)
      expect(reading?.about.length).toBeGreaterThan(12)
      expect(reading?.worlds.length).toBeGreaterThan(0)
      expect(reading?.themes.length).toBeGreaterThanOrEqual(2)
      expect(reading?.themes.length).toBeLessThanOrEqual(3)
    }
    const counts = new Map<string, number>()
    for (const book of arguedBooks) {
      for (const theme of readingOf(book.id)?.themes ?? []) {
        expect(theme.includes('#')).toBe(false)
        counts.set(theme, (counts.get(theme) ?? 0) + 1)
      }
    }
    for (const [theme, count] of counts) {
      expect(count, theme).toBeGreaterThanOrEqual(2)
      expect(booksSharingTheme(theme)).toHaveLength(count)
    }
    expect(booksSharingTheme('אמהות ובנות')).toEqual(expect.arrayContaining(['1024772', '1027378']))
  })

  it('scores a closer questionnaire match higher, up to 100', () => {
    const close = bookByTableId('997641')
    const far = bookByTableId('1014520')
    expect(close && far).toBeTruthy()
    const feel: SeatAnswers = {
      seedId: null,
      direction: 'different',
      seek: 'feel',
      heaviness: 'lasting',
      moment: 'regular',
      life: 'love',
      sofa: 'quiet',
      origin: 'translated',
    }
    const better = fitEstimate(close!, feel)
    const worse = fitEstimate(far!, feel)
    expect(better).toBeGreaterThan(worse)
    expect(better).toBeLessThanOrEqual(100)
    expect(worse).toBeGreaterThanOrEqual(0)
    const seats = seatThree(feel)
    expect(new Set(seats.map((seat) => seat.fit)).size).toBeGreaterThan(1)
  })

  it('names the earlier book when a Simania reader links the next three', () => {
    const seats = seatThree(
      {
        seedId: null,
        direction: 'different',
        seek: 'feel',
        heaviness: 'lasting',
        moment: 'regular',
        life: 'family',
        sofa: 'quiet',
        origin: 'translated',
      },
      ['1013486', '1014959', '1026524'],
    )
    const guest = seats.find((seat) => seat.book.title === 'האורחת האחרונה')
    expect(guest?.viaNote).toContain('lealand')
    expect(guest?.viaNote).toContain('שומרי הזמן')
    expect(guest?.viaNote).toContain('מהשלושה הקודמים')
    expect(guest?.reasons.some((reason) => reason.includes('שומרי'))).toBe(false)
    expect(guest?.tags).toEqual(['אבות ובנות', 'חתונה'])
    const elsewhere = seatForBook('1024772', base, seats, 'אמהות ובנות')
    expect(elsewhere?.book.title).toBe('קול השכחה')
    expect(elsewhere?.reasons).toEqual([themeReason('אמהות ובנות')])
    expect(elsewhere?.tags).toContain('אמהות ובנות')
    expect(booksSharingTheme('אמהות ובנות', '1024772').length).toBeGreaterThan(0)
  })

  it('keeps the trio explanation when the chosen book is already on the table', () => {
    const seats = seatThree(base)
    const again = seatForBook(seats[0].book.id, base, seats, 'אמונה')
    expect(again?.reasons).toEqual(seats[0].reasons)
    const book = bookByTableId('1024772')
    const picked = describeSeat(book!, base, themeReason('זיכרון'))
    expect(picked.viaNote).toBeNull()
    expect(picked.fit).toBeGreaterThanOrEqual(0)
    expect(picked.fit).toBeLessThanOrEqual(100)
  })

  it('explains the three books by subject and prose, not by length', () => {
    const seats = seatThree({
      seedId: null,
      direction: 'similar',
      seek: 'grip',
      heaviness: 'light',
      moment: 'returning',
      life: 'love',
      sofa: 'devour',
      origin: 'original',
    })
    const lines = seats.flatMap((seat) => seat.reasons)
    expect(lines.some((line) => line.includes('עמוד'))).toBe(false)
    expect(seats.every((seat) => seat.about.length > 12 && seat.proseNote.includes('הכתיבה'))).toBe(true)
    expect(lines.some((line) => line.includes('כתיבה') || line.includes('נוגע') || line.includes('עולם'))).toBe(true)
    expect(new Set(lines).size).toBe(lines.length)
  })

  it('shortens a review to its first sentence', () => {
    expect(firstSentence('זה משפט ראשון שהוא באמת מספיק ארוך כדי לעמוד לבד. וזה השני.')).toBe(
      'זה משפט ראשון שהוא באמת מספיק ארוך כדי לעמוד לבד.',
    )
  })
})
