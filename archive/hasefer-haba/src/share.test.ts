import { describe, expect, it } from 'vitest'
import { seatThree, type SeatAnswers } from './engine/seat'
import { decodeResult, encodeResult, resultLocation } from './share'
import type { Session } from './storage'

const answers: SeatAnswers = {
  seedId: '1010320',
  direction: 'similar',
  seek: 'feel',
  heaviness: 'light',
  moment: 'returning',
  life: 'family',
  sofa: 'quiet',
  origin: 'original',
}

describe('result links', () => {
  it('roundtrips the answers, the skipped books, and the picked book', () => {
    const session: Session = {
      name: 'chosen',
      answers,
      exclude: ['1001', '1002', '1003'],
      bookId: '1004',
      personaId: 'table',
    }
    expect(decodeResult(`?${encodeResult(session)}`)).toEqual(session)
  })

  it('keeps a link to the three books stable when nothing was skipped', () => {
    const session: Session = { name: 'results', answers: { ...answers, seedId: null }, exclude: [] }
    const search = encodeResult(session)
    expect(search).not.toContain('seed=')
    expect(search).not.toContain('skip=')
    expect(search).not.toContain('pick=')
    expect(decodeResult(search)).toEqual(session)
    const opened = decodeResult(search)
    expect(opened?.name).toBe('results')
    if (opened?.name !== 'results') return
    expect(seatThree(opened.answers, opened.exclude).map((seat) => seat.book.id)).toEqual(
      seatThree(session.answers, session.exclude).map((seat) => seat.book.id),
    )
  })

  it('builds a path under the site base', () => {
    const session: Session = { name: 'results', answers, exclude: ['1001'] }
    expect(resultLocation(session, '/readingg/')).toBe(`/readingg/?${encodeResult(session)}`)
    expect(resultLocation({ name: 'intro' }, '/readingg/')).toBe('/readingg/')
  })

  it('keeps a searched theme on the link and drops one the catalog does not have', () => {
    const session: Session = { name: 'results', answers, exclude: [], themes: ['חתונה'] }
    const search = encodeResult(session)
    expect(search).toContain('theme=')
    expect(decodeResult(search)).toEqual(session)
    const params = new URLSearchParams(search)
    params.set('theme', 'חתונה,אין דבר כזה,חתונה')
    expect(decodeResult(params.toString())).toEqual(session)
    expect(encodeResult({ name: 'results', answers, exclude: [] })).not.toContain('theme=')
  })

  it('rejects a link that would show a different result', () => {
    const search = encodeResult({ name: 'results', answers, exclude: [] })
    expect(decodeResult(search.replace('direction=similar', 'direction=sideways'))).toBeNull()
    expect(decodeResult(`${search}&skip=not-a-book`)).toBeNull()
    expect(decodeResult(search.replace('v=1', 'v=2'))).toBeNull()
    expect(decodeResult('')).toBeNull()
  })
})
