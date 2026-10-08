import { describe, expect, it } from 'vitest'
import { arguedBooks, catalogSeeds } from './table'
import { firstSentence, seatThree, type SeatAnswers } from './seat'

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
    expect(lines.filter((line) => line.includes('עמוד')).length).toBeLessThanOrEqual(1)
  })

  it('does not explain every book by how long it is', () => {
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
    expect(new Set(lines).size).toBe(lines.length)
    expect(lines.filter((line) => line.includes('עמוד')).length).toBeLessThanOrEqual(1)
    expect(lines.some((line) => line.includes('ביקור'))).toBe(true)
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
    if (hasLink) expect(next.some((seat) => seat.reasons.some((reason) => reason.includes('המליץ גם')))).toBe(true)
  })

  it('shortens a review to its first sentence', () => {
    expect(firstSentence('זה משפט ראשון שהוא באמת מספיק ארוך כדי לעמוד לבד. וזה השני.')).toBe(
      'זה משפט ראשון שהוא באמת מספיק ארוך כדי לעמוד לבד.',
    )
  })
})
