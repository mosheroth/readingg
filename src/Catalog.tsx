import { useEffect, useState } from 'react'

interface CatalogBook {
  id: number
  title: string
  author: string | null
  translator: string | null
  publisher: string | null
  publishedYear: number | null
  category: string | null
  subcategory: string | null
  coverUrl: string | null
  url: string
  reviewCount: number
  avgRating: number | null
  excerpt: string | null
  reviewUrl: string | null
}

interface CatalogResponse {
  ok: boolean
  error?: string
  books: CatalogBook[]
  total: number
  modernSinceYear?: number
  counts?: { books: number; reviews: number }
  backfill?: { done: boolean; seen: number }
}

export default function Catalog() {
  const [modern, setModern] = useState(true)
  const [books, setBooks] = useState<CatalogBook[]>([])
  const [total, setTotal] = useState(0)
  const [year, setYear] = useState<number | null>(null)
  const [seen, setSeen] = useState(0)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({ limit: '24', modern: modern ? '1' : '0' })
    fetch(`/api/books?${params}`, { signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json()) as CatalogResponse
        if (!response.ok || !body.ok) throw new Error(body.error || 'לא הצלחנו לטעון את המאגר')
        setBooks(body.books)
        setTotal(body.total)
        setYear(body.modernSinceYear ?? null)
        setSeen(body.backfill?.seen ?? body.counts?.reviews ?? 0)
        setDone(body.backfill?.done ?? false)
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return
        setBooks([])
        setTotal(0)
        setError(reason instanceof Error ? reason.message : 'לא הצלחנו לטעון את המאגר')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [modern])

  return (
    <section className="catalog">
      <p className="kicker">מסימניה, בלי להעתיק את האתר</p>
      <h1>ספרים מהשנתיים האחרונות</h1>
      <p className="lede">
        דגימה של ביקורות חדשות כל שעה, ומילוי אחורה עד ביקורות בנות שנתיים. במאגר נשמר הטקסט. כאן מופיע תקציר וקישור
        לסימניה.
        {year !== null && modern ? ` מוצגים ספרים שיצאו מ־${year} ואילך, וספרים בלי שנת הוצאה.` : ''}
      </p>
      <div className="row">
        <button className={modern ? 'primary' : 'ghost'} type="button" onClick={() => setModern(true)}>
          יצאו לאחרונה
        </button>
        <button className={!modern ? 'primary' : 'ghost'} type="button" onClick={() => setModern(false)}>
          כל מה שדיברו עליו
        </button>
      </div>
      <p className="catalog-status">
        {loading && 'טוען את המאגר…'}
        {!loading && error && error}
        {!loading && !error && `${total} ספרים במבט הזה · ${seen} ביקורות נשמרו${done ? ' · המילוי אחורה הושלם' : ''}`}
      </p>
      {!loading && !error && books.length === 0 && (
        <p className="note">עוד אין כאן ספרים. אחרי החיבור ל־Postgres הדגימה מתחילה למלא את המאגר.</p>
      )}
      <ul className="catalog-list">
        {books.map((book) => (
          <li key={book.id} className="book">
            {book.coverUrl ? <img src={book.coverUrl} alt="" /> : <span className="cover-fallback" aria-hidden="true" />}
            <div>
              <h2>
                <a href={book.url} target="_blank" rel="noreferrer">
                  {book.title}
                </a>
              </h2>
              <p className="by">
                {[book.author, book.translator ? `תרגום: ${book.translator}` : null].filter(Boolean).join(' · ')}
              </p>
              <p className="meta">
                {[book.publishedYear, book.publisher, book.subcategory || book.category].filter(Boolean).join(' · ')}
                {book.avgRating !== null ? ` · דירוג ${book.avgRating}` : ''}
                {book.reviewCount > 1 ? ` · ${book.reviewCount} ביקורות` : ''}
              </p>
              {book.excerpt && <p className="excerpt">{book.excerpt}</p>}
              {book.reviewUrl && (
                <a className="review-link" href={book.reviewUrl} target="_blank" rel="noreferrer">
                  הביקורת בסימניה
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
