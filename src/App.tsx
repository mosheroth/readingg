import { useEffect, useState } from 'react'
import { availability, readUrl, searchUrl, toBook, TOPICS, type Audience, type Book, type Kind } from './libby'

type Reader = { book: Book; mode: 'sample' | 'read' }

export default function App() {
  const [audience, setAudience] = useState<Audience>('juvenile')
  const [kind, setKind] = useState<Kind>('ebook')
  const [subject, setSubject] = useState('')
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState('')
  const [page, setPage] = useState(1)
  const [books, setBooks] = useState<Book[]>([])
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [picked, setPicked] = useState<Book | null>(null)
  const [reader, setReader] = useState<Reader | null>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    const url = searchUrl({ audience, kind, subject, query, page })
    fetch(url, { signal: ctrl.signal })
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status))
        return response.json() as Promise<{ items?: unknown[]; totalItems?: number }>
      })
      .then((data) => {
        const next = (data.items ?? []).map((item) => toBook(item as Parameters<typeof toBook>[0])).filter((item): item is Book => item !== null)
        setBooks((current) => (page === 1 ? next : [...current, ...next]))
        setTotal(data.totalItems ?? next.length)
        setStatus('ready')
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setStatus('error')
      })
    return () => ctrl.abort()
  }, [audience, kind, subject, query, page])

  function retune(next: { audience?: Audience; kind?: Kind; subject?: string }) {
    const audienceNext = next.audience ?? audience
    const kindNext = next.kind ?? kind
    const subjectNext = next.subject !== undefined ? next.subject : subject
    if (audienceNext === audience && kindNext === kind && subjectNext === subject && page === 1) return
    setPicked(null)
    setPage(1)
    setBooks([])
    setStatus('loading')
    setAudience(audienceNext)
    setKind(kindNext)
    setSubject(subjectNext)
  }

  return (
    <>
      <header>
        <h1>ספרים לילדים ולנוער</h1>
        <p className="note">
          מהספרייה העירונית הוד השרון, דרך Libby (הספרייה הדיגיטלית ישראל). בוחרים ספר כאן, וקוראים אותו בליבי עם מספר הקורא של הספרייה.
        </p>
      </header>
      <main>
        <div className="row" role="group" aria-label="גיל">
          <button type="button" className={audience === 'juvenile' ? 'on' : ''} onClick={() => retune({ audience: 'juvenile' })}>ילדים</button>
          <button type="button" className={audience === 'youngadult' ? 'on' : ''} onClick={() => retune({ audience: 'youngadult' })}>נוער</button>
        </div>
        <div className="row" role="group" aria-label="סוג">
          <button type="button" className={kind === 'ebook' ? 'on' : ''} onClick={() => retune({ kind: 'ebook' })}>ספרים</button>
          <button type="button" className={kind === 'audiobook' ? 'on' : ''} onClick={() => retune({ kind: 'audiobook' })}>ספרי שמע</button>
        </div>
        <div className="row" role="group" aria-label="קטגוריות">
          {TOPICS.map((topic) => (
            <button key={topic.id || 'all'} type="button" className={subject === topic.id ? 'on' : ''} onClick={() => retune({ subject: topic.id })}>
              {topic.label}
            </button>
          ))}
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            const next = draft.trim()
            if (next === query && page === 1) return
            setPicked(null)
            setPage(1)
            setBooks([])
            setStatus('loading')
            setQuery(next)
          }}
        >
          <input type="search" value={draft} placeholder="שם ספר או סופר" onChange={(event) => setDraft(event.target.value)} />
          <button type="submit">חיפוש</button>
        </form>
        {picked && (
          <section className="detail">
            <h2>{picked.title}</h2>
            {picked.author && <p className="muted">{picked.author}</p>}
            <p className="muted">{picked.kind === 'audiobook' ? 'ספר שמע' : 'ספר'} · {availability(picked)}</p>
            {picked.description && <p>{picked.description}</p>}
            <div className="row">
              <button type="button" onClick={() => setReader({ book: picked, mode: 'read' })}>לקריאה</button>
              {picked.sample && <button type="button" onClick={() => setReader({ book: picked, mode: 'sample' })}>טעימה</button>}
              <button type="button" onClick={() => setPicked(null)}>סגירה</button>
            </div>
          </section>
        )}
        {status === 'error' && <p>לא הצלחנו להביא את הרשימה מליבי. נסו שוב.</p>}
        {status === 'ready' && books.length === 0 && <p>אין ספרים בקטגוריה הזו.</p>}
        <div className="grid">
          {books.map((book) => (
            <button key={book.id} type="button" className="card" onClick={() => setPicked(book)}>
              {book.cover ? <img src={book.cover} alt="" /> : <span className="muted">בלי כריכה</span>}
              <h2>{book.title}</h2>
              {book.author && <span className="muted">{book.author}</span>}
              <span className="muted">{availability(book)}</span>
            </button>
          ))}
        </div>
        {status === 'loading' && <p>טוען…</p>}
        {status === 'ready' && books.length < total && (
          <p>
            <button type="button" onClick={() => setPage((current) => current + 1)}>עוד ספרים</button>
            <span className="muted"> {books.length} מתוך {total}</span>
          </p>
        )}
      </main>
      {reader && (
        <div className="reader">
          <div className="bar">
            <button type="button" onClick={() => setReader(null)}>חזרה למדף</button>
            <strong>{reader.book.title}</strong>
            <a href={readUrl(reader.book.id)} target="_blank" rel="noreferrer">פתיחה בליבי</a>
          </div>
          <iframe
            title={reader.mode === 'sample' ? 'טעימה' : 'קריאה בליבי'}
            src={reader.mode === 'sample' ? reader.book.sample : readUrl(reader.book.id)}
          />
        </div>
      )}
    </>
  )
}
