import { describe, expect, it } from 'vitest'
import { availability, plainText, readUrl, searchUrl, toBook } from './libby'

describe('libby shelf', () => {
  it('searches Hebrew kids ebooks in the Israel Digital catalog', () => {
    const url = new URL(
      searchUrl({ audience: 'juvenile', kind: 'ebook', subject: '24', query: ' אוגי ', page: 2 }),
    )
    expect(url.origin + url.pathname).toBe('https://thunder.api.overdrive.com/v2/libraries/telaviv/media')
    expect(url.searchParams.get('language')).toBe('he')
    expect(url.searchParams.get('maturityLevel')).toBe('juvenile')
    expect(url.searchParams.get('mediaTypes')).toBe('ebook')
    expect(url.searchParams.get('subject')).toBe('24')
    expect(url.searchParams.get('query')).toBe('אוגי')
    expect(url.searchParams.get('page')).toBe('2')
    expect(url.searchParams.get('sortBy')).toBe('mostpopular')
  })

  it('omits an empty topic and an empty search', () => {
    const url = new URL(searchUrl({ audience: 'youngadult', kind: 'audiobook', subject: '', query: '  ', page: 1 }))
    expect(url.searchParams.get('maturityLevel')).toBe('youngadult')
    expect(url.searchParams.get('mediaTypes')).toBe('audiobook')
    expect(url.searchParams.has('subject')).toBe(false)
    expect(url.searchParams.has('query')).toBe(false)
  })

  it('opens the title inside Libby for this library', () => {
    expect(readUrl('3510000')).toBe('https://libbyapp.com/library/telaviv/everything/page-1/3510000')
  })

  it('turns a catalog record into a card', () => {
    const book = toBook({
      id: 3510000,
      title: 'אוגי ואני',
      firstCreatorName: 'ר.ג\'. פלסיו',
      description: '<p>שלום&nbsp;עולם</p>',
      type: { id: 'ebook' },
      isAvailable: false,
      holdsCount: 2,
      covers: { cover150Wide: { href: 'https://img.example/cover.jpg' } },
      sample: { href: 'https://samples.overdrive.com/?crid=abc' },
    })
    expect(book).toMatchObject({
      id: '3510000',
      author: "ר.ג'. פלסיו",
      description: 'שלום עולם',
      available: false,
      sample: 'https://samples.overdrive.com/?crid=abc',
    })
    expect(book && availability(book)).toBe('תפוס · 2 ממתינים')
  })

  it('drops a record without a title', () => {
    expect(toBook({ id: 1 })).toBeNull()
    expect(plainText('')).toBe('')
  })
})
