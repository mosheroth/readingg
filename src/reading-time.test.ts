import { describe, expect, it } from 'vitest'
import { readingClock } from './reading-time'

describe('readingClock', () => {
  it('turns pages into hours and minutes, about a minute a page', () => {
    expect(readingClock(204)).toBe('3:24')
    expect(readingClock(90)).toBe('1:30')
    expect(readingClock(1056)).toBe('17:36')
  })

  it('stays quiet when the page count is missing', () => {
    expect(readingClock(null)).toBeNull()
    expect(readingClock(0)).toBeNull()
  })
})