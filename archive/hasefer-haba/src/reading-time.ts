const MINUTES_PER_PAGE = 1

/** Hours and minutes, like 3:24. About a minute a page. Null when the page count is missing. */
export function readingClock(pages: number | null): string | null {
  if (pages == null || pages <= 0) return null
  const minutes = Math.round(pages * MINUTES_PER_PAGE)
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return `${hours}:${String(rest).padStart(2, '0')}`
}
