import { describe, expect, it } from 'vitest'
import { bookByTableId } from './table'
import { bookTaste, readerCertainty, tasteHome, type TasteMark } from './taste'

function mark(bookId: string, kind: TasteMark['kind'], title = 'ספר'): TasteMark {
  const book = bookByTableId(bookId)
  return { bookId, title: book?.title ?? title, author: book?.author ?? 'מחבר', kind, at: 1 }
}

describe('taste', () => {
  it('withholds percentages until a book has been marked', () => {
    const book = bookByTableId('1027378')
    expect(book).toBeTruthy()
    const taste = bookTaste(book!, [])
    expect(taste.fit).toBeNull()
    expect(taste.certainty).toBe(0)
    expect(taste.collecting).toBe(true)
    expect(tasteHome([]).picks).toHaveLength(0)
    expect(tasteHome([]).starters.length).toBeGreaterThan(0)
  })

  it('keeps certainty low after one loved book, and cites that book', () => {
    const loved = mark('1024772', 'loved')
    const book = bookByTableId('1027378')!
    const taste = bookTaste(book, [loved])
    expect(readerCertainty([loved])).toBeLessThan(20)
    expect(taste.certainty).toBeLessThanOrEqual(24)
    expect(taste.collecting).toBe(true)
    expect(taste.fit).toBeGreaterThan(70)
    expect(taste.reasons[0]).toContain(loved.title)
    expect(taste.reasons[0]).toContain('אמהות ובנות')
    expect(taste.gap).toContain('תובענית')
  })

  it('lowers the fit when a similar book was not for them', () => {
    const book = bookByTableId('1027378')!
    const taste = bookTaste(book, [mark('1024772', 'disliked')])
    expect(taste.fit).toBeLessThan(40)
    expect(taste.reasons[0]).toContain('לא אהבתם')
  })

  it('counts a book without a stored reading for less, and never reaches 100', () => {
    const profiled = mark('1024772', 'loved')
    const bare = mark('999999', 'loved', 'ספר בלי קריאה')
    expect(readerCertainty([bare])).toBeLessThan(readerCertainty([profiled]))
    const crowded = Array.from({ length: 40 }, () => mark('1024772', 'loved'))
    expect(readerCertainty(crowded)).toBeGreaterThan(80)
    expect(readerCertainty(crowded)).toBeLessThanOrEqual(90)
  })
})
