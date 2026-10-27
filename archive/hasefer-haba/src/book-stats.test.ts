import { describe, expect, it } from 'vitest'
import { bookStats } from './book-stats'
import { publishers } from './data/publishers'
import { arguedBooks } from './engine/table'

describe('bookStats', () => {
  it('names a publisher for every disputed book', () => {
    for (const book of arguedBooks) {
      expect(publishers[book.id]?.length).toBeGreaterThan(1)
    }
  })

  it('lines up the details the way a book page does, from the publisher to the clock', () => {
    const book = arguedBooks.find((item) => item.id === '1025563')
    expect(book).toBeTruthy()
    expect(bookStats(book!).map((stat) => `${stat.label}: ${stat.value}`)).toEqual([
      'הוצאה: ידיעות ספרים',
      "ז'אנר: מתח ריגול והרפתקאות",
      'שנת הוצאה: 2025',
      "מס' עמודים: 360",
      'זמן קריאה משוער: 6:00 שעות',
    ])
  })

  it('skips the clock when the page count is missing', () => {
    const book = arguedBooks.find((item) => item.id === '1025223')
    expect(book?.pages).toBeNull()
    const ids = bookStats(book!).map((stat) => stat.id)
    expect(ids).not.toContain('pages')
    expect(ids).not.toContain('time')
    expect(ids[0]).toBe('publisher')
  })
})