import { describe, expect, it } from 'vitest'
import { arguedBooks, catalogSeeds, descriptionLead, fold, pickThree, searchBooks, type TableAnswers } from './table'

describe('argued books', () => {
  it('keeps only books that have a real recommendation and a real rejection', () => {
    expect(arguedBooks.length).toBeGreaterThanOrEqual(3)
    const ids = new Set<string>()
    for (const book of arguedBooks) {
      expect(ids.has(book.id)).toBe(false)
      ids.add(book.id)
      expect(book.praise.rating).toBeGreaterThanOrEqual(4)
      expect(book.dissent.rating === 1 || book.dissent.rating === 2).toBe(true)
      expect(book.praise.excerpt.length).toBeGreaterThan(40)
      expect(book.dissent.excerpt.length).toBeGreaterThan(40)
      expect(book.praise.url).toContain('simania.co.il')
      expect(book.dissent.url).toContain('simania.co.il')
      expect(book.praise.reviewId).not.toBe(book.dissent.reviewId)
      if (book.avgRating != null) expect(book.avgRating).toBeGreaterThan(0)
      if (book.simaniaReviewCount != null) expect(book.simaniaReviewCount).toBeGreaterThan(0)
      for (const person of book.advocates) {
        expect(person.reviewer.length).toBeGreaterThan(0)
        expect(person.also.length).toBeGreaterThan(0)
        expect(person.also.length).toBeLessThanOrEqual(3)
        expect(person.also.every((item) => item.id !== book.id && item.title.length > 0 && item.url.includes('simania.co.il'))).toBe(true)
      }
    }
    expect(arguedBooks.some((book) => book.coverUrl.startsWith('https://'))).toBe(true)
    expect(arguedBooks.some((book) => book.avgRating != null && book.simaniaReviewCount != null)).toBe(true)
    expect(arguedBooks.some((book) => book.advocates.some((person) => person.also.length > 0))).toBe(true)
  })
})

describe('descriptionLead', () => {
  it('keeps the first line and leaves the rest for MORE', () => {
    expect(descriptionLead('שורה ראשונה.\nעוד שורה.\n\nועוד אחת.')).toEqual({
      lead: 'שורה ראשונה.',
      rest: 'עוד שורה.\n\nועוד אחת.',
    })
    expect(descriptionLead('רק שורה אחת.')).toEqual({ lead: 'רק שורה אחת.', rest: '' })
    expect(descriptionLead('')).toEqual({ lead: '', rest: '' })
  })
})

describe('searchBooks', () => {
  it('waits for two characters and finds a title or an author', () => {
    expect(searchBooks('ח')).toEqual([])
    const swim = searchBooks('swim')
    expect(swim.some((seed) => seed.title === 'SWIM')).toBe(true)
    const cat = searchBooks('חתול נודד')
    expect(cat[0]?.title).toContain('חתול נודד')
    expect(fold('״חתול״')).toBe('חתול')
  })
})

describe('pickThree', () => {
  const originalSeed = catalogSeeds.find(
    (seed) => seed.subcategory === 'ספרות מקורית' && !arguedBooks.some((book) => book.id === seed.id),
  )
  const translatedSeed = catalogSeeds.find((seed) => seed.subcategory === 'ספרות מתורגמת')

  it('stays next to the last book when asked for more of that world', () => {
    expect(originalSeed).toBeTruthy()
    const picks = pickThree({ seedId: originalSeed!.id, direction: 'similar', origin: 'original' })
    expect(picks).toHaveLength(3)
    expect(picks.every((book) => book.origin === 'original' && book.subcategory === 'ספרות מקורית')).toBe(true)
    expect(picks.some((book) => book.id === originalSeed!.id)).toBe(false)
  })

  it('lets the origin answer override similarity', () => {
    expect(originalSeed).toBeTruthy()
    const picks = pickThree({ seedId: originalSeed!.id, direction: 'similar', origin: 'translated' })
    expect(picks).toHaveLength(3)
    expect(picks.every((book) => book.origin === 'translated')).toBe(true)
  })

  it('leaves the last book’s shelf when asked for another direction', () => {
    expect(translatedSeed).toBeTruthy()
    const answers: TableAnswers = { seedId: translatedSeed!.id, direction: 'different', origin: 'either' }
    const picks = pickThree(answers)
    expect(picks).toHaveLength(3)
    expect(picks.every((book) => book.subcategory !== 'ספרות מתורגמת')).toBe(true)
    expect(new Set(picks.map((book) => book.id)).size).toBe(3)
  })

  it('spreads a surprise across shelves and stays deterministic', () => {
    const answers: TableAnswers = { seedId: translatedSeed?.id ?? null, direction: 'surprise', origin: 'either' }
    const first = pickThree(answers)
    const second = pickThree(answers)
    expect(first.map((book) => book.id)).toEqual(second.map((book) => book.id))
    expect(new Set(first.map((book) => book.subcategory)).size).toBeGreaterThanOrEqual(2)
  })

  it('offers another three that were not already on the table', () => {
    const answers: TableAnswers = { seedId: null, direction: 'similar', origin: 'either' }
    const first = pickThree(answers)
    const next = pickThree(
      answers,
      first.map((book) => book.id),
    )
    expect(next).toHaveLength(3)
    expect(next.every((book) => !first.some((item) => item.id === book.id))).toBe(true)
  })

  it('still picks three when there is no last book', () => {
    expect(pickThree({ seedId: null, direction: 'surprise', origin: 'original' })).toHaveLength(3)
  })
})
