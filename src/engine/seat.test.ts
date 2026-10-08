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
  it('seats three different readers with three different books', () => {
    const seats = seatThree(base)
    expect(seats.map((seat) => seat.persona.id)).toEqual(['yael', 'tom', 'nadav'])
    expect(new Set(seats.map((seat) => seat.book.id)).size).toBe(3)
    expect(seats.every((seat) => seat.book.origin === 'translated')).toBe(true)
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
  })

  it('offers another three that were not already seated', () => {
    const first = seatThree(base)
    const next = seatThree(
      base,
      first.map((seat) => seat.book.id),
    )
    expect(next).toHaveLength(3)
    expect(next.every((seat) => !first.some((item) => item.book.id === seat.book.id))).toBe(true)
  })

  it('shortens a review to its first sentence', () => {
    expect(firstSentence('זה משפט ראשון שהוא באמת מספיק ארוך כדי לעמוד לבד. וזה השני.')).toBe(
      'זה משפט ראשון שהוא באמת מספיק ארוך כדי לעמוד לבד.',
    )
  })
})
