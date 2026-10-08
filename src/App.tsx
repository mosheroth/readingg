import { useEffect, useMemo, useState } from 'react'
import Catalog from './Catalog'
import { questions } from './data/questions'
import { seatSummary, seatThree, type Seat, type SeatAnswers } from './engine/seat'
import { arguedBooks, type OriginChoice } from './engine/table'
import { BookFacts, BookScore, BookStep, Cover, DirectionStep } from './Show'
import { loadSession, loadShelf, saveSeat, saveSession, type SeatDraft, type Session, type ShelfItem } from './storage'
import type { Heaviness, Life, Moment, Seek, Sofa } from './types'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const STEPS = 8
const tasteIds = ['seek', 'heaviness', 'moment', 'life', 'sofa'] as const

const originQuestion: { title: string; options: { value: OriginChoice; label: string; hint: string }[] } = {
  title: 'איזה קול, ומאיפה הוא מגיע?',
  options: [
    { value: 'original', label: 'ספרות מקור', hint: 'עברית, שפה ורחוב מכאן' },
    { value: 'translated', label: 'מתורגם', hint: 'מהעולם, העיקר הסיפור' },
    { value: 'either', label: 'לא משנה', hint: 'שיהיה הספר הנכון' },
  ],
}

function shelfLine(item: ShelfItem): string {
  if (item.personaId === 'table') return `${item.author} · נבחר אחרי ביקורת טובה ורעה`
  const verb = item.personaId === 'yael' ? 'שכנעה' : 'שכנע'
  return `${item.author} · ${item.personaName} ${verb}`
}

function withTaste(draft: SeatDraft, id: (typeof tasteIds)[number], value: string): SeatDraft {
  if (id === 'seek') return { ...draft, seek: value as Seek }
  if (id === 'heaviness') return { ...draft, heaviness: value as Heaviness }
  if (id === 'moment') return { ...draft, moment: value as Moment }
  if (id === 'life') return { ...draft, life: value as Life }
  return { ...draft, sofa: value as Sofa }
}

export default function App() {
  const [session, setSession] = useState<Session>(() => loadSession() ?? { name: 'intro' })
  const [pane, setPane] = useState<'table' | 'catalog'>('table')
  const [shelf, setShelf] = useState<ShelfItem[]>([])
  const [debating, setDebating] = useState(false)
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    setShelf(loadShelf())
  }, [])

  useEffect(() => {
    saveSession(session)
  }, [session])

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  function openResults(answers: SeatAnswers, exclude: string[]) {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setDebating(true)
    setSession({ name: 'results', answers, exclude })
    window.setTimeout(() => setDebating(false), reduce ? 0 : 1100)
  }

  function finish(draft: SeatDraft, origin: OriginChoice) {
    const { seedId, direction, seek, heaviness, moment, life, sofa } = draft
    if (!direction || !seek || !heaviness || !moment || !life || !sofa) {
      setSession({ name: 'quiz', step: 1, draft })
      return
    }
    openResults({ seedId, direction, seek, heaviness, moment, life, sofa, origin }, [])
  }

  const seated = session.name === 'results' || session.name === 'chosen' ? session : null
  const seats = useMemo(() => {
    if (!seated) return []
    return seatThree(seated.answers, seated.exclude)
  }, [seated])

  return (
    <div className="app">
      <div className="lamp" aria-hidden="true" />
      <header className="top">
        <button
          className="mark"
          type="button"
          onClick={() => {
            setPane('table')
            setSession({ name: 'intro' })
          }}
        >
          <span className="live" aria-hidden="true" />
          השולחן
        </button>
        <button className="ghost nav" type="button" onClick={() => setPane('catalog')}>
          המאגר
        </button>
        {pane === 'table' && session.name === 'quiz' && (
          <p className="progress">
            שאלה {session.step + 1} מתוך {STEPS}
          </p>
        )}
      </header>
      <main>
        {pane === 'catalog' && <Catalog />}
        {pane === 'table' && session.name === 'intro' && (
          <Intro
            shelf={shelf}
            canInstall={installEvent !== null}
            onInstall={() => {
              void installEvent?.prompt()
              setInstallEvent(null)
            }}
            onStart={() => setSession({ name: 'quiz', step: 0, draft: { seedId: null } })}
          />
        )}
        {pane === 'table' && session.name === 'quiz' && session.step === 0 && (
          <BookStep
            onBack={() => setSession({ name: 'intro' })}
            onSkip={() => setSession({ name: 'quiz', step: 1, draft: { seedId: null } })}
            onPick={(seed) => setSession({ name: 'quiz', step: 1, draft: { seedId: seed.id } })}
          />
        )}
        {pane === 'table' && session.name === 'quiz' && session.step === 1 && (
          <DirectionStep
            seedId={session.draft.seedId}
            onBack={() => setSession({ name: 'quiz', step: 0, draft: session.draft })}
            onChoose={(direction) => setSession({ name: 'quiz', step: 2, draft: { ...session.draft, direction } })}
          />
        )}
        {pane === 'table' && session.name === 'quiz' && session.step >= 2 && session.step <= 6 && (
          <TasteStep
            step={session.step}
            onBack={() => setSession({ name: 'quiz', step: session.step - 1, draft: session.draft })}
            onChoose={(value) => {
              const id = tasteIds[session.step - 2]
              setSession({ name: 'quiz', step: session.step + 1, draft: withTaste(session.draft, id, value) })
            }}
          />
        )}
        {pane === 'table' && session.name === 'quiz' && session.step === 7 && (
          <ChoiceStep
            title={originQuestion.title}
            options={originQuestion.options}
            onBack={() => setSession({ name: 'quiz', step: 6, draft: session.draft })}
            onChoose={(origin) => finish(session.draft, origin as OriginChoice)}
          />
        )}
        {pane === 'table' && session.name === 'results' && debating && <Debate />}
        {pane === 'table' && session.name === 'results' && !debating && (
          <Results
            answers={session.answers}
            seats={seats}
            canReroll={seatThree(session.answers, [...session.exclude, ...seats.map((seat) => seat.book.id)]).length === 3}
            onChoose={(seat) => {
              setShelf(saveSeat(seat))
              setSession({
                name: 'chosen',
                answers: session.answers,
                exclude: session.exclude,
                bookId: seat.book.id,
                personaId: 'table',
              })
            }}
            onReroll={() => openResults(session.answers, [...session.exclude, ...seats.map((seat) => seat.book.id)])}
            onRestart={() => setSession({ name: 'quiz', step: 0, draft: { seedId: null } })}
          />
        )}
        {pane === 'table' && session.name === 'chosen' && (
          <Chosen
            seat={seats.find((seat) => seat.book.id === session.bookId) ?? null}
            onBack={() => setSession({ name: 'results', answers: session.answers, exclude: session.exclude })}
            onRestart={() => setSession({ name: 'quiz', step: 0, draft: { seedId: null } })}
          />
        )}
      </main>
    </div>
  )
}

function Intro({
  shelf,
  canInstall,
  onInstall,
  onStart,
}: {
  shelf: ShelfItem[]
  canInstall: boolean
  onInstall: () => void
  onStart: () => void
}) {
  return (
    <section className="intro">
      <p className="kicker">אתה חייב לקרוא את זה</p>
      <h1>שלושה ספרים, ועל כל אחד ויכוח.</h1>
      <p className="lede">
        אומרים מה קראתם לאחרונה ומה בא לכם עכשיו. על השולחן עולים שלושה ספרים, עם הסבר למה כל אחד מתאים, ועם ביקורת טובה
        וביקורת רעה אמיתיות.
      </p>
      <p className="fine">
        כרגע יש {arguedBooks.length} ספרים כאלה במאגר. בלי ביקורת נגדית אמיתית הספר לא נכנס. זו לא תוכנית הטלוויזיה,
        ואין כאן זיקה לכאן.
      </p>
      <div className="row">
        <button className="primary" type="button" onClick={onStart}>
          מתחילים
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

function TasteStep({ step, onBack, onChoose }: { step: number; onBack: () => void; onChoose: (value: string) => void }) {
  const question = questions.find((item) => item.id === tasteIds[step - 2])
  if (!question) return null
  return <ChoiceStep title={question.title} options={question.options} onBack={onBack} onChoose={onChoose} />
}

function ChoiceStep({
  title,
  options,
  onBack,
  onChoose,
}: {
  title: string
  options: { value: string; label: string; hint: string }[]
  onBack: () => void
  onChoose: (value: string) => void
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Backspace' && !(event.target instanceof HTMLInputElement)) {
        event.preventDefault()
        onBack()
        return
      }
      const option = options[Number(event.key) - 1]
      if (option) onChoose(option.value)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onBack, onChoose, options])

  return (
    <section className="quiz">
      <h1>{title}</h1>
      <div className="options">
        {options.map((option, index) => (
          <button key={option.value} className="option" type="button" onClick={() => onChoose(option.value)}>
            <span className="index">{index + 1}</span>
            <span>
              <strong>{option.label}</strong>
              <small>{option.hint}</small>
            </span>
          </button>
        ))}
      </div>
      <button className="texty" type="button" onClick={onBack}>
        חזרה
      </button>
    </section>
  )
}

function Debate() {
  return (
    <section className="debate" aria-live="polite">
      <p className="kicker">רגע</p>
      <h1>שלושה ספרים עולים.</h1>
      <p className="lede">לפי מה שסיפרתם, ולפי קוראים שכבר המליצו על ספר קרוב.</p>
    </section>
  )
}

function reviewLine(kind: 'בעד' | 'נגד', reviewer: string, rating: number, lead: string) {
  return (
    <>
      <span className="who">
        {kind} · {reviewer} · דירוג {rating} מתוך 5
      </span>
      {lead}
    </>
  )
}

function Results({
  answers,
  seats,
  canReroll,
  onChoose,
  onReroll,
  onRestart,
}: {
  answers: SeatAnswers
  seats: Seat[]
  canReroll: boolean
  onChoose: (seat: Seat) => void
  onReroll: () => void
  onRestart: () => void
}) {
  return (
    <section className="results">
      <p className="kicker">שלושה ספרים על השולחן</p>
      <h1>שלושה ספרים לפי מה שסיפרתם.</h1>
      <p className="summary">{seatSummary(answers)}</p>
      <div className="cards">
        {seats.map((seat) => (
          <article key={seat.book.id} className="card">
            <div className="card-book">
              <Cover src={seat.book.coverUrl} />
              <div>
                <h2>{seat.book.title}</h2>
                <BookScore book={seat.book} />
                <BookFacts book={seat.book} part="facts" />
              </div>
            </div>
            <div className="why">
              <p className="why-kicker">למה זה מתאים</p>
              <ul>
                {seat.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
            <BookFacts book={seat.book} part="blurb" />
            <p className="pitch">{reviewLine('בעד', seat.book.praise.reviewer, seat.book.praise.rating, seat.praiseLead)}</p>
            <p className="jab">{reviewLine('נגד', seat.book.dissent.reviewer, seat.book.dissent.rating, seat.dissentLead)}</p>
            <button className="primary" type="button" onClick={() => onChoose(seat)}>
              זה הספר
            </button>
          </article>
        ))}
      </div>
      <p className="fine">הציטוטים מסימניה, המשפט הראשון. הביקורת המלאה נפתחת שם. הספר עצמו לא יושב כאן.</p>
      <div className="row center">
        {canReroll && (
          <button className="ghost" type="button" onClick={onReroll}>
            שלושה אחרים
          </button>
        )}
        <button className="texty" type="button" onClick={onRestart}>
          מההתחלה
        </button>
      </div>
    </section>
  )
}

function Chosen({ seat, onBack, onRestart }: { seat: Seat | null; onBack: () => void; onRestart: () => void }) {
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
          <BookScore book={seat.book} />
          <BookFacts book={seat.book} part="facts" />
        </div>
      </div>
      <div className="why">
        <p className="why-kicker">למה זה מתאים</p>
        <ul>
          {seat.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </div>
      <BookFacts book={seat.book} part="blurb" />
      <p className="pitch">{reviewLine('בעד', seat.book.praise.reviewer, seat.book.praise.rating, seat.praiseLead)}</p>
      <p className="jab">{reviewLine('נגד', seat.book.dissent.reviewer, seat.book.dissent.rating, seat.dissentLead)}</p>
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
        <button className="ghost" type="button" onClick={onBack}>
          חזרה לשלושה
        </button>
        <button className="texty" type="button" onClick={onRestart}>
          סקר חדש
        </button>
      </div>
    </section>
  )
}
