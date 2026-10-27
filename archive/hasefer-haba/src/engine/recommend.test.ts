import { describe, expect, it } from 'vitest'
import type { Answers } from '../types'
import { recommend } from './recommend'

const feelIsrael: Answers = {
  seek: 'feel',
  heaviness: 'lasting',
  moment: 'regular',
  origin: 'israel',
  life: 'family',
  sofa: 'quiet',
}

const pageTurner: Answers = {
  seek: 'grip',
  heaviness: 'light',
  moment: 'returning',
  origin: 'world',
  life: 'ideas',
  sofa: 'mystery',
}

const learner: Answers = {
  seek: 'learn',
  heaviness: 'deep',
  moment: 'challenge',
  origin: 'either',
  life: 'ideas',
  sofa: 'underline',
}

const lightLift: Answers = {
  seek: 'lift',
  heaviness: 'light',
  moment: 'afterHeavy',
  origin: 'either',
  life: 'love',
  sofa: 'devour',
}

describe('recommend', () => {
  it('puts three different books on the table, one from each reader', () => {
    const recs = recommend(feelIsrael)
    expect(recs.map((rec) => rec.persona.id)).toEqual(['yael', 'tom', 'nadav'])
    expect(new Set(recs.map((rec) => rec.book.id)).size).toBe(3)
    expect(new Set(recs.map((rec) => rec.book.author)).size).toBe(3)
  })

  it('keeps an Israeli family story close to Israeli books', () => {
    const recs = recommend(feelIsrael)
    expect(recs.filter((rec) => rec.book.origin === 'israel').length).toBeGreaterThanOrEqual(2)
    expect(recs[0].book.origin).toBe('israel')
    expect(recs[0].book.themes.includes('family') || recs[0].book.themes.includes('love')).toBe(true)
    expect(recs[0].book.genres[0]).not.toBe('thriller')
  })

  it('gives the fast reader a page-turner when asked for grip and a mystery', () => {
    const recs = recommend(pageTurner)
    const tom = recs[1]
    expect(tom.persona.id).toBe('tom')
    expect(tom.book.pace).toBe('fast')
    expect(['thriller', 'mystery', 'sf', 'humor', 'romance']).toContain(tom.book.genres[0])
    expect(tom.book.weight).not.toBe('heavy')
  })

  it('lets the ideas reader bring nonfiction when the survey asks to learn', () => {
    const recs = recommend(learner)
    expect(recs[2].persona.id).toBe('nadav')
    expect(recs[2].book.fiction).toBe(false)
  })

  it('does not put a heavy book in front of someone who asked for something light', () => {
    const recs = recommend(lightLift)
    expect(recs.every((rec) => rec.book.weight !== 'heavy')).toBe(true)
  })

  it('can clear the table and bring three other books', () => {
    const first = recommend(learner)
    const second = recommend(learner, { exclude: first.map((rec) => rec.book.id) })
    const overlap = second.filter((rec) => first.some((prev) => prev.book.id === rec.book.id))
    expect(second).toHaveLength(3)
    expect(overlap).toHaveLength(0)
  })

  it('talks about the survey and the specific book', () => {
    const [yael] = recommend(feelIsrael)
    expect(yael.pitch).toContain(yael.book.title)
    expect(yael.pitch).toContain('שייגע')
    expect(yael.pitch).toContain('משפחה')
    expect(yael.jab.length).toBeGreaterThan(10)
  })

  it('is stable for the same answers', () => {
    const once = recommend(pageTurner).map((rec) => rec.book.id)
    const twice = recommend(pageTurner).map((rec) => rec.book.id)
    expect(twice).toEqual(once)
  })
})
