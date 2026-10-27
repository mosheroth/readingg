import { publishers } from './data/publishers'
import { readingClock } from './reading-time'

export type StatId = 'publisher' | 'genre' | 'year' | 'pages' | 'time'

export interface BookStat {
  id: StatId
  label: string
  value: string
}

export function bookStats(book: {
  id: string
  pages: number | null
  year: number | null
  category: string
  subcategory: string
}): BookStat[] {
  const stats: BookStat[] = []
  const publisher = publishers[book.id]
  if (publisher) stats.push({ id: 'publisher', label: 'הוצאה', value: publisher })
  const genre = book.subcategory || book.category
  if (genre) stats.push({ id: 'genre', label: "ז'אנר", value: genre })
  if (book.year) stats.push({ id: 'year', label: 'שנת הוצאה', value: String(book.year) })
  if (book.pages && book.pages > 0) stats.push({ id: 'pages', label: "מס' עמודים", value: book.pages.toLocaleString('he-IL') })
  const clock = readingClock(book.pages)
  if (clock) stats.push({ id: 'time', label: 'זמן קריאה משוער', value: `${clock} שעות` })
  return stats
}
