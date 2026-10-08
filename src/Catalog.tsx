import { useEffect, useMemo, useState } from 'react'
import { sliceCatalog, type CatalogEntry } from './engine/catalog'

interface CatalogData {
  catalogBooks: CatalogEntry[]
  reviewTotal: number
}

const PAGE = 24

export default function Catalog() {
  const [data, setData] = useState<CatalogData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [modern, setModern] = useState(true)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    let cancelled = false
    import('./data/catalog-data')
      .then((mod) => {
        if (!cancelled) setData({ catalogBooks: mod.catalogBooks, reviewTotal: mod.reviewTotal })
      })
      .catch(() => {
        if (!cancelled) setError('לא הצלחנו לפתוח את המאגר')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const page = useMemo(() => {
    if (!data) return null
    return sliceCatalog(data.catalogBooks, data.reviewTotal, {
      modern,
      offset: 0,
      limit: offset + PAGE,
      now: new Date(),
    })
  }, [data, modern, offset])

  const books = page?.books ?? []
  const total = page?.total ?? 0

  return (
    <section className="catalog">
      <p className="kicker">מסימניה, בלי להעתיק את האתר</p>
      <h1>הספרים שנאספו</h1>
      <p className="lede">
        הקטלוג יושב בתוך האתר. אין כאן שרת. לכל ספר יש תקציר וקישור לסימניה, והביקורת המלאה נשארת שם.
        {page && modern ? ` במבט הזה ספרים שיצאו מ־${page.modernSinceYear} ואילך, וספרים בלי שנת הוצאה.` : ''}
      </p>
      <div className="row">
        <button
          className={modern ? 'primary' : 'ghost'}
          type="button"
          onClick={() => {
            setOffset(0)
            setModern(true)
          }}
        >
          יצאו לאחרונה
        </button>
        <button
          className={!modern ? 'primary' : 'ghost'}
          type="button"
          onClick={() => {
            setOffset(0)
            setModern(false)
          }}
        >
          כל מה שדיברו עליו
        </button>
      </div>
      <p className="catalog-status">
        {!data && !error && 'טוען את המאגר…'}
        {error}
        {page &&
          `${total} ספרים במבט הזה · ${page.counts.books} ספרים ו־${page.counts.reviews} ביקורות באתר`}
      </p>
      {page && books.length === 0 && <p className="note">אין ספרים במבט הזה.</p>}
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
      {page && books.length > 0 && books.length < total && (
        <button className="ghost more" type="button" onClick={() => setOffset(offset + PAGE)}>
          עוד ספרים
        </button>
      )}
    </section>
  )
}
