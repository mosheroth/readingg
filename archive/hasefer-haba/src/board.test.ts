import { describe, expect, it } from 'vitest'
import { seatFromBoard, sofaFor } from './board'

describe('seatFromBoard', () => {
  it('folds the dropped questions into a full set of answers', () => {
    expect(
      seatFromBoard({
        seedId: null,
        direction: 'similar',
        seek: 'learn',
        heaviness: 'deep',
        life: 'ideas',
        origin: 'original',
      }),
    ).toEqual({
      seedId: null,
      direction: 'surprise',
      seek: 'learn',
      heaviness: 'deep',
      moment: 'regular',
      life: 'ideas',
      sofa: 'underline',
      origin: 'original',
    })
  })

  it('keeps the distance when a last book is on the table', () => {
    const answers = seatFromBoard({
      seedId: '1025563',
      direction: 'similar',
      seek: 'grip',
      heaviness: 'light',
      life: 'love',
      origin: 'translated',
    })
    expect(answers.direction).toBe('similar')
    expect(answers.sofa).toBe('devour')
    expect(sofaFor('feel')).toBe('quiet')
    expect(sofaFor('weird')).toBe('quiet')
  })
})