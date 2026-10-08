import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { cronAllowed } from './auth'
import { excerpt, isChallenge, parseBookPage, parseFeedIds, parseReviewPage } from './parse'

const fixtureDir = dirname(fileURLToPath(import.meta.url))

describe('simania book page', () => {
  it('reads the description, the aggregate rating, and the catalog counts', () => {
    const book = {
      id: 1028445,
      title: 'מפגש עם עצמי בגיהנום',
      subtitle: '',
      nameInEnglish: 'Meeting Myself in Hell',
      author2: '',
      editor: 'עורך',
      publisher: 'סלע מאיר',
      isbn: '9789651234567',
      danacode: '',
      series: '',
      seriesNumber: '',
      language: '',
      isAudioBook: 0,
      description: '"הגוף נעשה קל."\nבמהלך השבי.',
      viewCount: 55,
      ownersCount: 2,
      reviewCount: 2,
      currentlyReading: 0,
    }
    const schema = {
      '@type': 'Book',
      productID: '1028445',
      inLanguage: 'he',
      bookFormat: 'https://schema.org/Paperback',
      aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.7', ratingCount: 3, bestRating: '5', worstRating: '1' },
    }
    const flight = `${JSON.stringify(book)}\n${JSON.stringify(schema)}`
    const html = `<title>ספר</title><script>self.__next_f.push([1,${JSON.stringify(flight)}])</script>`
    expect(parseBookPage(html, 1028445)).toMatchObject({
      description: '"הגוף נעשה קל."\nבמהלך השבי.',
      englishTitle: 'Meeting Myself in Hell',
      editor: 'עורך',
      isbn: '9789651234567',
      language: 'he',
      format: 'Paperback',
      avgRating: 4.7,
      ratingCount: 3,
      simaniaReviewCount: 2,
      viewCount: 55,
      ownersCount: 2,
      currentlyReading: 0,
      bookFetched: true,
    })
  })
})

describe('simania review page', () => {
  const html = readFileSync(join(fixtureDir, 'fixtures/review-136218.html'), 'utf8')

  it('reads the book and the review from the flight payload', () => {
    const parsed = parseReviewPage(html, 136218)
    expect(parsed).toMatchObject({
      reviewId: 136218,
      bookId: 1026644,
      title: 'חלאות יקרות לליבנו',
      author: 'ריטה קוגן',
      publisher: 'קתרזיס',
      publishedYear: 2026,
      pages: 187,
      category: 'ספרות',
      subcategory: 'ספרות מקורית',
      reviewer: 'rea',
      reviewerId: 165045,
      rating: 3,
      writtenAt: '2026-04-17T08:42:12.000Z',
      likes: 7,
    })
    expect(parsed?.body.startsWith('במרכז הספר שלוש נובלות')).toBe(true)
    expect(parsed?.coverUrl).toContain('1026644')
  })

  it('ignores a cloudflare challenge', () => {
    const challenge = '<title>Just a moment...</title><p>cdn-cgi/challenge-platform</p>'
    expect(isChallenge(challenge)).toBe(true)
    expect(parseReviewPage(challenge, 1)).toBeNull()
  })
})

describe('split review text', () => {
  it('follows a flight pointer to the review body', () => {
    const body = 'שלום עולם, זו ביקורת שלמה.'
    const length = Buffer.byteLength(body).toString(16)
    const flight = JSON.stringify({
      review: {
        id: 5,
        bookId: 9,
        userId: 3,
        content: '$71',
        rating: 5,
        date: '2026-01-02T00:00:00.000Z',
        likesCount: 1,
        reviewer: { id: 3, name: 'דנה' },
      },
      book: {
        id: 9,
        title: 'ספר קטן',
        author: 'סופר',
        publisher: 'הוצאה',
        year: 2025,
        pages: 40,
        category: 'ספרות',
        subCategory: 'מקורית',
        imageUrl: 'https://cdn.simania.co.il/cover.jpg',
      },
    })
    const html = `<title>ביקורת</title><script>self.__next_f.push([1,${JSON.stringify(flight)}])</script><script>self.__next_f.push([1,"71:T${length},"])</script><script>self.__next_f.push([1,${JSON.stringify(body)}])</script>`
    const parsed = parseReviewPage(html, 5)
    expect(parsed?.body).toBe(body)
    expect(parsed?.title).toBe('ספר קטן')
  })
})

describe('simania feed', () => {
  it('collects review ids once, newest first', () => {
    const html = readFileSync(join(fixtureDir, 'fixtures/feed-snippet.html'), 'utf8')
    expect(parseFeedIds(html)).toEqual([137934, 137900])
  })
})

describe('excerpt', () => {
  it('keeps a short review and trims a long one on a space', () => {
    expect(excerpt('משפט קצר')).toBe('משפט קצר')
    const long = `${'מילה '.repeat(80)}סוף`
    const trimmed = excerpt(long, 40)
    expect(trimmed.endsWith('…')).toBe(true)
    expect(trimmed.length).toBeLessThanOrEqual(41)
  })
})

describe('cron auth', () => {
  it('requires the bearer secret in production and allows local runs without one', () => {
    const previous = { secret: process.env.CRON_SECRET, env: process.env.VERCEL_ENV }
    process.env.CRON_SECRET = 's3cret'
    process.env.VERCEL_ENV = 'production'
    expect(cronAllowed('Bearer s3cret')).toBe(true)
    expect(cronAllowed('Bearer other')).toBe(false)
    delete process.env.CRON_SECRET
    expect(cronAllowed(null)).toBe(false)
    delete process.env.VERCEL_ENV
    expect(cronAllowed(null)).toBe(true)
    if (previous.secret === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = previous.secret
    if (previous.env === undefined) delete process.env.VERCEL_ENV
    else process.env.VERCEL_ENV = previous.env
  })
})
