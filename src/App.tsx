import { useEffect, useMemo, useState } from 'react'
import { bookStats, type StatId } from './book-stats'
import Catalog from './Catalog'
import { booksSharingTheme } from './data/readings'
import { describeSeat, seatForBook, seatThree, themeReason, type Seat, type SeatAnswers } from './engine/seat'
import { bookTaste, markLabel, tasteHome, type BookTaste, type MarkKind, type TasteMark } from './engine/taste'
import { arguedBooks, bookByTableId, type DisputedBook, type Voice } from './engine/table'
import Finder from './Finder'
import { freshSearch, type TableSearch } from './search-table'
import { decodeResult, syncResultUrl } from './share'
import { BookFacts, BookScore, Cover } from './Show'
import { loadSession, loadShelf, loadTaste, saveSeat, saveSession, saveTaste, toggleTaste, type Session, type ShelfItem } from './storage'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function shelfLine(item: ShelfItem): string {
  if (item.personaId === 'table') return `${item.author} · נבחר אחרי ביקורת טובה ורעה`
  const verb = item.personaId === 'yael' ? 'שכנעה' : 'שכנע'
  return `${item.author} · ${item.personaName} ${verb}`
}

function openingSession(): Session {
  const next = freshSearch()
  return resultSession(next.answers, [], next.themes)
}

function initialSession(): Session {
  if (typeof window === 'undefined') return openingSession()
  const shared = decodeResult(window.location.search)
  if (shared) return shared
  const stored = loadSession()
  if (!stored || stored.name === 'intro' || stored.name === 'quiz') return openingSession()
  return stored
}

function resultSession(answers: SeatAnswers, exclude: string[], themes: string[]): Session {
  return themes.length > 0 ? { name: 'results', answers, exclude, themes } : { name: 'results', answers, exclude }
}

export default function App() {
  const [session, setSession] = useState<Session>(initialSession)
  const [pane, setPane] = useState<'table' | 'catalog'>('table')
  const [shelf, setShelf] = useState<ShelfItem[]>([])
  const [marks, setMarks] = useState<TasteMark[]>([])
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [viaTheme, setViaTheme] = useState<string | null>(null)

  useEffect(() => {
    setShelf(loadShelf())
    setMarks(loadTaste())
  }, [])

  useEffect(() => {
    saveSession(session)
    syncResultUrl(session)
  }, [session])

  useEffect(() => {
    function onPop() {
      setViaTheme(null)
      setPane('table')
      setSession(decodeResult(window.location.search) ?? openingSession())
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  function updateSearch(next: TableSearch) {
    setViaTheme(null)
    setSession(resultSession(next.answers, [], next.themes))
  }

  function chooseBook(seat: Seat, theme?: string) {
    if (session.name !== 'results' && session.name !== 'chosen') return
    setViaTheme(theme ?? null)
    setShelf(saveSeat(seat))
    setSession({
      name: 'chosen',
      answers: session.answers,
      exclude: session.exclude,
      ...(session.themes && session.themes.length > 0 ? { themes: session.themes } : {}),
      bookId: seat.book.id,
      personaId: 'table',
    })
  }

  function onMark(book: { id: string; title: string; author: string }, kind: MarkKind) {
    setMarks((current) => {
      const next = toggleTaste(current, { bookId: book.id, title: book.title, author: book.author, kind })
      saveTaste(next)
      return next
    })
  }

  function startSearch() {
    setViaTheme(null)
    setPane('table')
    const next = freshSearch()
    setSession(resultSession(next.answers, [], next.themes))
  }

  const seated = session.name === 'results' || session.name === 'chosen' ? session : null
  const seats = useMemo(() => {
    if (!seated) return []
    return seatThree(seated.answers, seated.exclude, seated.themes ?? [])
  }, [seated])
  const chosenSeat = useMemo(() => {
    if (session.name !== 'chosen') return null
    return seatForBook(session.bookId, session.answers, seats, viaTheme)
  }, [session, seats, viaTheme])

  return (
    <div className="app">
      <div className="lamp" aria-hidden="true" />
      <header className="top">
        <button
          className="mark"
          type="button"
          onClick={startSearch}
        >
          <span className="live" aria-hidden="true" />
          הספר הבא
        </button>
        <button className="ghost nav" type="button" onClick={() => setPane('catalog')}>
          המאגר
        </button>
      </header>
      <main>
        {pane === 'catalog' && <Catalog />}
        {pane === 'table' && session.name === 'results' && (
          <Results
            shelf={shelf}
            canInstall={installEvent !== null}
            onInstall={() => {
              void installEvent?.prompt()
              setInstallEvent(null)
            }}
            answers={session.answers}
            themes={session.themes ?? []}
            marks={marks}
            onSearch={updateSearch}
            onChoose={(seat) => chooseBook(seat)}
            onMark={onMark}
            onPickTheme={(bookId, theme) => {
              const book = bookByTableId(bookId)
              if (!book) return
              chooseBook(describeSeat(book, session.answers, themeReason(theme)), theme)
            }}
            onRestart={startSearch}
          />
        )}
        {pane === 'table' && session.name === 'chosen' && (
          <Chosen
            seat={chosenSeat}
            marks={marks}
            onMark={onMark}
            onPickTheme={(bookId, theme) => {
              const book = bookByTableId(bookId)
              if (!book) return
              chooseBook(describeSeat(book, session.answers, themeReason(theme)), theme)
            }}
            onBack={() => {
              setViaTheme(null)
              setSession(resultSession(session.answers, session.exclude, session.themes ?? []))
            }}
            onRestart={startSearch}
          />
        )}
      </main>
    </div>
  )
}

function ForYou({ taste }: { taste: BookTaste }) {
  return (
    <section className="foryou" aria-label="בשבילכם">
      <p className="why-kicker">בשבילכם</p>
      {taste.fit === null ? (
        <p className="gap">{taste.gap}</p>
      ) : (
        <>
          <p className="fit-pair">
            <span>
              <b>{taste.fit}%</b> התאמה
            </span>
            <span>
              <b>{taste.certainty}%</b> ודאות
            </span>
          </p>
          {taste.collecting && <p className="collecting">עדיין אוספים</p>}
          {taste.reasons.length > 0 && (
            <ul>
              {taste.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          )}
          {taste.gap && <p className="gap">{taste.gap}</p>}
        </>
      )}
    </section>
  )
}

function MarkBar({
  book,
  marks,
  onMark,
}: {
  book: { id: string; title: string; author: string }
  marks: TasteMark[]
  onMark: (book: { id: string; title: string; author: string }, kind: MarkKind) => void
}) {
  const current = marks.find((mark) => mark.bookId === book.id)?.kind
  return (
    <div className="mark-bar" role="group" aria-label={`סימון של ${book.title}`}>
      {(Object.keys(markLabel) as MarkKind[]).map((kind) => (
        <button key={kind} className={current === kind ? 'on' : ''} type="button" aria-pressed={current === kind} onClick={() => onMark(book, kind)}>
          {markLabel[kind]}
        </button>
      ))}
    </div>
  )
}

function Byline({ book }: { book: DisputedBook }) {
  return (
    <p className="byline">
      <span className="author">{book.author}</span>
      {book.translator ? <span className="byline-tr">תרגום: {book.translator}</span> : null}
    </p>
  )
}

function StatIcon({ id }: { id: StatId }) {
  if (id === 'time') {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="10" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M16 10.2V16l3.4 2.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    )
  }
  if (id === 'pages') {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M10 6.5h9.2L24 11.2V25.5H10z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M19.2 6.5V11.2H24M13.4 16.2h7M13.4 20.2h7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    )
  }
  if (id === 'year') {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <rect x="6.5" y="8" width="19" height="16.5" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M6.5 13.2h19M11.2 6.2v4M20.8 6.2v4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    )
  }
  if (id === 'genre') {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M8 8.2h7.4L24 16.8 16.8 24 8 15.2z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <circle cx="12.2" cy="12.4" r="1.15" fill="currentColor" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M6.5 14.2 16 7l9.5 7.2V25a1.4 1.4 0 0 1-1.4 1.4h-5.4v-6.1h-5.4v6.1H7.9A1.4 1.4 0 0 1 6.5 25z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

function StatRow({ book }: { book: DisputedBook }) {
  const stats = bookStats(book)
  if (stats.length === 0) return null
  return (
    <ul className="stats">
      {stats.map((stat) => (
        <li key={stat.id}>
          <StatIcon id={stat.id} />
          <span className="stat-label">{stat.label}</span>
          <span className="stat-value">{stat.value}</span>
        </li>
      ))}
    </ul>
  )
}

function ReadingNote({
  seat,
  openTheme,
  onTheme,
  onPickTheme,
}: {
  seat: Seat
  openTheme: string | null
  onTheme: (theme: string) => void
  onPickTheme: (bookId: string, theme: string) => void
}) {
  return (
    <div className="reading">
      <p className="why-kicker">על מה זה</p>
      <p className="about">{seat.about}</p>
      {seat.tags.length > 0 && (
        <ul className="hashtags">
          {seat.tags.map((tag) => (
            <li key={tag}>
              <button type="button" className={openTheme === tag ? 'on' : ''} aria-pressed={openTheme === tag} onClick={() => onTheme(tag)}>
                <span aria-hidden="true">#</span>
                {tag}
              </button>
            </li>
          ))}
        </ul>
      )}
      {openTheme && <ThemeShelf theme={openTheme} exceptId={seat.book.id} onPick={onPickTheme} />}
    </div>
  )
}

function ThemeShelf({
  theme,
  exceptId,
  onPick,
}: {
  theme: string
  exceptId: string
  onPick: (bookId: string, theme: string) => void
}) {
  const books = booksSharingTheme(theme, exceptId)
    .map((id) => bookByTableId(id))
    .filter((book) => book !== null)
  if (books.length === 0) return null
  return (
    <div className="theme-shelf">
      <p className="why-kicker">
        עוד ספרים עם <bdi>#{theme}</bdi>
      </p>
      <ul>
        {books.map((book) => (
          <li key={book.id}>
            <button type="button" onClick={() => onPick(book.id, theme)}>
              {book.coverUrl ? <img src={book.coverUrl} alt="" /> : <span className="theme-fallback" aria-hidden="true" />}
              <span>
                <span className="theme-title">{book.title}</span>
                <span className="theme-author">{book.author}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ViaNote({ note }: { note: string | null }) {
  if (!note) return null
  return (
    <p className="via">
      <span className="via-kicker">מסימניה</span>
      {note}
    </p>
  )
}

function ReviewQuote({ kind, voice, lead }: { kind: 'בעד' | 'נגד'; voice: Voice; lead: string }) {
  const [open, setOpen] = useState(false)
  const full = voice.excerpt.replace(/\s+/g, ' ').trim()
  const canOpen = full.length > lead.length
  const text = open ? full : lead
  return (
    <div className={kind === 'בעד' ? 'pitch' : 'jab'}>
      <span className="who">
        <span className="thumb" aria-hidden="true">
          {kind === 'בעד' ? '👍' : '👎'}
        </span>
        <span>
          {kind} · {voice.reviewer} · דירוג {voice.rating} מתוך 5
        </span>
      </span>
      {canOpen ? (
        <button type="button" className={open ? 'quote open' : 'quote'} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {text}
        </button>
      ) : (
        <span className="quote">{text}</span>
      )}
      {canOpen && (
        <button type="button" className="expand" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {open ? 'פחות' : 'עוד'}
        </button>
      )}
      {open && full.endsWith('…') && (
        <a className="review-more" href={voice.url} target="_blank" rel="noreferrer">
          הביקורת המלאה בסימניה
        </a>
      )}
    </div>
  )
}

function Results({
  answers,
  themes,
  marks,
  shelf,
  canInstall,
  onSearch,
  onChoose,
  onMark,
  onPickTheme,
  onRestart,
  onInstall,
}: {
  answers: SeatAnswers
  themes: string[]
  marks: TasteMark[]
  shelf: ShelfItem[]
  canInstall: boolean
  onSearch: (next: TableSearch) => void
  onChoose: (seat: Seat) => void
  onMark: (book: { id: string; title: string; author: string }, kind: MarkKind) => void
  onPickTheme: (bookId: string, theme: string) => void
  onRestart: () => void
  onInstall: () => void
}) {
  const [open, setOpen] = useState<{ bookId: string; theme: string } | null>(null)
  const home = tasteHome(marks, { origin: answers.origin, themes })
  const shownIds = (home.picks.length > 0 ? home.picks.map((pick) => pick.book.id) : home.starters.map((book) => book.id)).join('-')
  useEffect(() => {
    setOpen(null)
  }, [shownIds])
  const shareLine = [...home.picks.map((pick) => pick.book.title), ...themes.map((theme) => `#${theme}`)].join(' · ')
  return (
    <section className="results">
      <p className="kicker">{home.collecting ? 'עדיין אוספים' : 'יש על מה להישען'}</p>
      <h1>{marks.length === 0 ? 'מה כבר קראתם?' : 'הטעם עד עכשיו'}</h1>
      <p className="portrait">{home.line}</p>
      {marks.length > 0 && (
        <p className="fit">
          <span className="fit-num">{home.certainty}%</span>
          <span className="fit-label">ודאות. כמה מהטעם כבר שמור במכשיר הזה</span>
        </p>
      )}
      <Finder answers={answers} themes={themes} onChange={onSearch} />
      <p className="sr" aria-live="polite">
        {(home.picks.length > 0 ? home.picks.map((pick) => pick.book.title) : home.starters.map((book) => book.title)).join(' · ')}
      </p>
      {home.picks.length > 0 ? (
        <div className="cards" key={shownIds}>
          {home.picks.map((pick) => {
            const seat = describeSeat(pick.book, answers, pick.taste.reasons[0] ?? pick.book.title)
            return (
              <article key={pick.book.id} className="card">
                <Cover src={pick.book.coverUrl} />
                <div className="card-body">
                  <h2>{pick.book.title}</h2>
                  <Byline book={pick.book} />
                  <ForYou taste={pick.taste} />
                  <BookScore book={pick.book} />
                  <ReadingNote
                    seat={seat}
                    openTheme={open?.bookId === pick.book.id ? open.theme : null}
                    onTheme={(theme) =>
                      setOpen((current) => (current?.bookId === pick.book.id && current.theme === theme ? null : { bookId: pick.book.id, theme }))
                    }
                    onPickTheme={onPickTheme}
                  />
                  <StatRow book={pick.book} />
                  <BookFacts book={pick.book} part="blurb" />
                  <ReviewQuote kind="בעד" voice={pick.book.praise} lead={seat.praiseLead} />
                  <ReviewQuote kind="נגד" voice={pick.book.dissent} lead={seat.dissentLead} />
                  <MarkBar book={pick.book} marks={marks} onMark={onMark} />
                  <button className="primary" type="button" onClick={() => onChoose(seat)}>
                    זה הספר
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="cards starters" key={shownIds}>
          {home.starters.map((book) => (
            <article key={book.id} className="card">
              <Cover src={book.coverUrl} />
              <div className="card-body">
                <h2>{book.title}</h2>
                <Byline book={book} />
                <p className="gap">בלי סימון אין אחוז התאמה ואין אחוז ודאות.</p>
                <MarkBar book={book} marks={marks} onMark={onMark} />
                <button
                  className="primary"
                  type="button"
                  onClick={() => onChoose(describeSeat(book, answers, book.title))}
                >
                  לעמוד הספר
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      <p className="fine">
        אחוז ההתאמה אומר עד כמה הספר יושב על ספרים שכבר סימנתם. אחוז הוודאות אומר כמה מהטעם כבר שמור, והוא נשאר נמוך בהתחלה ולא עובר 90%. מתחת ל־20% כתוב שעדיין אוספים. ספר בלי קריאה שמורה נספר רק לפי ז׳אנר, מקור ומחבר. זמן הקריאה משוער לפי בערך דקה לעמוד. על מה הספר, כבדות הכתיבה והתגיות נקראו פעם אחת מהתקציר ומשתי הביקורות בסימניה. לחיצה על תגית מביאה ספרים אחרים מאותו עניין. הציטוטים הם המשפט הראשון. הספר עצמו לא יושב כאן. כרגע יש {arguedBooks.length} ספרים עם ויכוח שמור. בלי ביקורת נגדית אמיתית הספר לא נכנס. זו לא תוכנית הטלוויזיה, ואין כאן זיקה לכאן.
      </p>
      <div className="row center">
        <ShareResult summary={shareLine} />
        <button className="texty" type="button" onClick={onRestart}>
          מההתחלה
        </button>
        {canInstall && (
          <button className="ghost" type="button" onClick={onInstall}>
            התקנה ב־Chrome
          </button>
        )}
      </div>
      {shelf.length > 0 && (
        <section className="shelf" aria-label="ספרים שכבר בחרתם">
          <h2>על המדף שלכם</h2>
          <ul>
            {shelf.map((item) => (
              <li key={item.bookId}>
                <strong>{item.title}</strong>
                <span>{shelfLine(item)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  )
}

async function writeClipboard(url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url)
    return true
  } catch {
    const area = document.createElement('textarea')
    area.value = url
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const copied = document.execCommand('copy')
    area.remove()
    return copied
  }
}

function ShareResult({ summary }: { summary: string }) {
  const [copied, setCopied] = useState(false)

  async function onShare() {
    const url = window.location.href
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'הספר הבא', text: summary, url })
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
    }
    if (!(await writeClipboard(url))) return
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button className="ghost" type="button" onClick={() => void onShare()}>
      {copied ? 'הקישור הועתק' : 'שיתוף הקישור'}
    </button>
  )
}

function Chosen({
  seat,
  marks,
  onMark,
  onPickTheme,
  onBack,
  onRestart,
}: {
  seat: Seat | null
  marks: TasteMark[]
  onMark: (book: { id: string; title: string; author: string }, kind: MarkKind) => void
  onPickTheme: (bookId: string, theme: string) => void
  onBack: () => void
  onRestart: () => void
}) {
  const [openTheme, setOpenTheme] = useState<string | null>(null)
  if (!seat) {
    return (
      <section className="chosen">
        <h1>הספר כבר לא בסל הוויכוח.</h1>
        <button className="primary" type="button" onClick={onRestart}>
          מההתחלה
        </button>
      </section>
    )
  }
  return (
    <section className="chosen">
      <p className="kicker">הספר שלכם</p>
      <div className="card-book">
        <Cover src={seat.book.coverUrl} />
        <div>
          <h1>{seat.book.title}</h1>
          <Byline book={seat.book} />
          <ForYou taste={bookTaste(seat.book, marks)} />
          <MarkBar book={seat.book} marks={marks} onMark={onMark} />
          <BookScore book={seat.book} />
        </div>
      </div>
      <ReadingNote
        seat={seat}
        openTheme={openTheme}
        onTheme={(theme) => setOpenTheme((current) => (current === theme ? null : theme))}
        onPickTheme={onPickTheme}
      />
      <StatRow book={seat.book} />
      <ViaNote note={seat.viaNote} />
      <BookFacts book={seat.book} part="blurb" />
      <ReviewQuote kind="בעד" voice={seat.book.praise} lead={seat.praiseLead} />
      <ReviewQuote kind="נגד" voice={seat.book.dissent} lead={seat.dissentLead} />
      <p className="note">
        הספר לא נמצא כאן בתוך האפליקציה. קונים אותו או שואלים בספרייה, ואז קוראים. הבחירה נשמרת על המדף במכשיר הזה.
      </p>
      <div className="row">
        <a className="primary" href={seat.book.bookUrl} target="_blank" rel="noreferrer">
          לעמוד הספר בסימניה
        </a>
        <a className="ghost" href={seat.book.praise.url} target="_blank" rel="noreferrer">
          הביקורת הטובה
        </a>
        <a className="ghost" href={seat.book.dissent.url} target="_blank" rel="noreferrer">
          הביקורת הרעה
        </a>
        <ShareResult summary={seat.book.title} />
        <button className="ghost" type="button" onClick={onBack}>
          חזרה לשלושה
        </button>
        <button className="texty" type="button" onClick={onRestart}>
          מההתחלה
        </button>
      </div>
    </section>
  )
}
