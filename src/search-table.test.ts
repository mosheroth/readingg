import { describe, expect, it } from 'vitest'
import { seatFromBoard } from './board'
import { searchBooks } from './engine/table'
import {
  applySuggestion,
  clearChip,
  findSuggestions,
  freshSearch,
  selectFilter,
  setDirection,
  starterThemes,
  visibleChips,
} from './search-table'

describe('findSuggestions', () => {
  it('finds a theme from part of its name, ahead of a book', () => {
    const found = findSuggestions('חתונ')
    expect(found[0]).toMatchObject({ kind: 'theme', theme: 'חתונה' })
  })

  it('finds a writing taste from part of its name', () => {
    const found = findSuggestions('קליל')
    expect(found.some((item) => item.kind === 'taste' && item.label === 'כתיבה קלילה')).toBe(true)
  })

  it('offers both the feeling and the themes when the word is shared', () => {
    const found = findSuggestions('אהבה')
    expect(found.some((item) => item.kind === 'taste' && item.field === 'life' && item.label === 'אהבה')).toBe(true)
    const themes = found.filter((item) => item.kind === 'theme').map((item) => (item.kind === 'theme' ? item.theme : ''))
    expect(themes).toContain('אהבה אסורה')
    expect(themes).toContain('אהבה לא שגרתית')
  })

  it('keeps distance words for after a book is chosen', () => {
    expect(findSuggestions('קרוב').some((item) => item.kind === 'taste' && item.field === 'direction')).toBe(false)
    expect(findSuggestions('קרוב', { seed: true }).some((item) => item.kind === 'taste' && item.label === 'קרוב')).toBe(true)
    const grossman = findSuggestions('גרוסמן')
    expect(grossman[0]).toMatchObject({ kind: 'book' })
  })

  it('starts from the themes more books share', () => {
    const starters = starterThemes()
    expect(starters.length).toBeGreaterThan(0)
    expect(starters.length).toBeLessThanOrEqual(8)
    expect(starters.every((item, index) => index === 0 || item.count <= starters[index - 1].count)).toBe(true)
    expect(starters.every((item) => item.count >= 2)).toBe(true)
  })
})

describe('applySuggestion', () => {
  it('puts the first book one step aside, and the next book keeps the distance', () => {
    const hits = searchBooks('גרוסמן', 4)
    const book = hits[0]
    const other = hits.find((item) => item.id !== book?.id)
    expect(book).toBeTruthy()
    expect(other).toBeTruthy()
    const first = applySuggestion(freshSearch(), { kind: 'book', id: book.id, title: book.title, author: book.author })
    expect(first.answers.seedId).toBe(book.id)
    expect(first.answers.direction).toBe('different')
    const close = setDirection(first, 'similar')
    const swapped = applySuggestion(close, { kind: 'book', id: other!.id, title: other!.title, author: other!.author })
    expect(swapped.answers.seedId).toBe(other!.id)
    expect(swapped.answers.direction).toBe('similar')
    const cleared = clearChip(swapped, { kind: 'book' })
    expect(cleared.answers.seedId).toBeNull()
    expect(cleared.answers.direction).toBe('surprise')
  })

  it('toggles themes up to four, and a feeling returns to the quiet default', () => {
    let current = freshSearch()
    for (const theme of ['חתונה', 'אמהות ובנות', 'אמנות', 'מלחמה', 'גורל']) {
      current = applySuggestion(current, { kind: 'theme', theme, count: 2 })
    }
    expect(current.themes).toEqual(['חתונה', 'אמהות ובנות', 'אמנות', 'מלחמה'])
    current = applySuggestion(current, { kind: 'theme', theme: 'חתונה', count: 2 })
    expect(current.themes).not.toContain('חתונה')

    current = applySuggestion(freshSearch(), { kind: 'taste', field: 'seek', value: 'learn', label: 'שילמד' })
    expect(current.answers.seek).toBe('learn')
    expect(current.answers.sofa).toBe('underline')
    expect(visibleChips(current).map((chip) => chip.label)).toEqual(['שילמד'])
    current = clearChip(current, { kind: 'seek' })
    expect(current.answers.seek).toBe('feel')
    expect(current.answers.sofa).toBe('quiet')
    expect(visibleChips(current)).toEqual([])
    expect(visibleChips(freshSearch())).toEqual([])
  })

  it('moves a visible filter, and choosing it again returns to the open default', () => {
    const deep = selectFilter(freshSearch(), 'heaviness', 'deep')
    expect(deep.answers.heaviness).toBe('deep')
    expect(selectFilter(deep, 'heaviness', 'deep').answers.heaviness).toBe('breathing')
    expect(selectFilter(freshSearch(), 'heaviness', 'breathing').answers.heaviness).toBe('breathing')
    const origin = selectFilter(freshSearch(), 'origin', 'original')
    expect(origin.answers.origin).toBe('original')
    expect(selectFilter(origin, 'origin', 'either').answers.origin).toBe('either')
  })

  it('does not move the table when a distance is chosen before any book', () => {
    const base = freshSearch()
    const next = applySuggestion(base, { kind: 'taste', field: 'direction', value: 'similar', label: 'קרוב' })
    expect(next).toEqual(base)
    expect(seatFromBoard({ ...base.answers, seedId: null, direction: 'similar', life: 'family', heaviness: 'breathing', seek: 'feel', origin: 'either' }).direction).toBe(
      'surprise',
    )
  })
})
