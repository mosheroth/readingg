import { useEffect, useMemo, useState } from 'react'
import Catalog from './Catalog'
import { bookById } from './data/books'
import { genreLabel, lengthLabel, originLabel, summaryLine } from './data/labels'
import { questions } from './data/questions'
import { recommend } from './engine/recommend'
import { loadSession, loadShelf, saveChoice, saveSession, type Session, type ShelfItem } from './storage'
import type { Answers, Recommendation } from './types'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function convinced(personaId: string): string {
  return personaId === 'yael' ? 'שכנעה' : 'שכנע'
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

  function openTable(answers: Answers, exclude: string[]) {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setDebating(true)
    setSession({ name: 'results', answers, exclude })
    window.setTimeout(() => setDebating(false), reduce ? 0 : 1100)
  }

  const results = session.name === 'results' || session.name === 'chosen' ? session : null
  const recommendations = useMemo(() => {
    if (!results) return []
    return recommend(results.answers, { exclude: results.exclude })
  }, [results])

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
            שאלה {session.step + 1} מתוך {questions.length}
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
            onStart={() => setSession({ name: 'quiz', step: 0, answers: {} })}
          />
        )}
        {pane === 'table' && session.name === 'quiz' && (
          <Quiz
            step={session.step}
            onBack={() => {
              if (session.step === 0) setSession({ name: 'intro' })
              else setSession({ ...session, step: session.step - 1 })
            }}
            onChoose={(value) => {
              const question = questions[session.step]
              const answers = { ...session.answers, [question.id]: value }
              if (session.step + 1 >= questions.length) openTable(answers as Answers, [])
              else setSession({ name: 'quiz', step: session.step + 1, answers })
            }}
          />
        )}
        {pane === 'table' && session.name === 'results' && debating && <Debate />}
        {pane === 'table' && session.name === 'results' && !debating && (
          <Results
            answers={session.answers}
            recommendations={recommendations}
            onChoose={(rec) => {
              setShelf(saveChoice(rec))
              setSession({
                name: 'chosen',
                answers: session.answers,
                exclude: session.exclude,
                bookId: rec.book.id,
                personaId: rec.persona.id,
              })
            }}
            onReroll={() =>
              openTable(session.answers, [...session.exclude, ...recommendations.map((rec) => rec.book.id)])
            }
            onRestart={() => setSession({ name: 'quiz', step: 0, answers: {} })}
          />
        )}
        {pane === 'table' && session.name === 'chosen' && (
          <Chosen
            rec={recommendations.find((item) => item.book.id === session.bookId) ?? null}
            fallbackId={session.bookId}
            personaId={session.personaId}
            onBack={() => setSession({ name: 'results', answers: session.answers, exclude: session.exclude })}
            onRestart={() => setSession({ name: 'quiz', step: 0, answers: {} })}
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
      <p className="kicker">שלושה קוראים, ספר אחד</p>
      <h1>מה כדאי לכם לקרוא עכשיו?</h1>
      <p className="lede">
        עונים על שש שאלות. יעל, תום ונדב, שלושה קוראים עם טעם שונה, מתווכחים ומניחים על השולחן שלוש המלצות. אתם
        בוחרים אחת.
      </p>
      <div className="names" aria-hidden="true">
        <span>יעל · הלב</span>
        <span>תום · הקצב</span>
        <span>נדב · הראש</span>
      </div>
      <div className="row">
        <button className="primary" type="button" onClick={onStart}>
          בואו נשב
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
                <span>
                  {item.author} · {item.personaName} {convinced(item.personaId)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  )
}

function Quiz({
  step,
  onBack,
  onChoose,
}: {
  step: number
  onBack: () => void
  onChoose: (value: Answers[keyof Answers]) => void
}) {
  const question = questions[step]
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Backspace') {
        event.preventDefault()
        onBack()
        return
      }
      const index = Number(event.key) - 1
      const option = question.options[index]
      if (option) onChoose(option.value)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onBack, onChoose, question])

  return (
    <section className="quiz">
      <h1>{question.title}</h1>
      <div className="options">
        {question.options.map((option, index) => (
          <button key={String(option.value)} className="option" type="button" onClick={() => onChoose(option.value)}>
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
      <h1>הם מתווכחים בחדר השני.</h1>
      <p className="lede">יעל רוצה שזה יישאר. תום רוצה שלא תישנו. נדב רוצה שתצאו אחרים.</p>
    </section>
  )
}

function Results({
  answers,
  recommendations,
  onChoose,
  onReroll,
  onRestart,
}: {
  answers: Answers
  recommendations: Recommendation[]
  onChoose: (rec: Recommendation) => void
  onReroll: () => void
  onRestart: () => void
}) {
  return (
    <section className="results">
      <p className="kicker">שלושה ספרים על השולחן</p>
      <h1>כל אחד נלחם על ספר אחר.</h1>
      <p className="summary">{summaryLine(answers)}</p>
      <div className="cards">
        {recommendations.map((rec) => (
          <article key={rec.persona.id} className={`card persona-${rec.persona.id}`}>
            <p className="role">{rec.persona.role}</p>
            <h2>{rec.persona.name}</h2>
            <p className="stance">{rec.persona.stance}</p>
            <p className="bring">{rec.persona.id === 'yael' ? 'מביאה את' : 'מביא את'}</p>
            <h3>{rec.book.title}</h3>
            <p className="author">{rec.book.author}</p>
            <p className="meta">
              {originLabel[rec.book.origin]} · {genreLabel[rec.book.genres[0]]} · {lengthLabel[rec.book.length]}
            </p>
            {rec.reasons.length > 0 && (
              <ul className="chips">
                {rec.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            )}
            <p className="pitch">{rec.pitch}</p>
            <p className="jab">{rec.jab}</p>
            <button className="primary" type="button" onClick={() => onChoose(rec)}>
              זה הספר
            </button>
          </article>
        ))}
      </div>
      <div className="row center">
        <button className="ghost" type="button" onClick={onReroll}>
          שלושה אחרים
        </button>
        <button className="texty" type="button" onClick={onRestart}>
          מההתחלה
        </button>
      </div>
    </section>
  )
}

function Chosen({
  rec,
  fallbackId,
  personaId,
  onBack,
  onRestart,
}: {
  rec: Recommendation | null
  fallbackId: string
  personaId: string
  onBack: () => void
  onRestart: () => void
}) {
  const book = rec?.book ?? bookById(fallbackId)
  const name = rec?.persona.name ?? (personaId === 'yael' ? 'יעל' : personaId === 'tom' ? 'תום' : 'נדב')
  if (!book) return null
  return (
    <section className="chosen">
      <p className="kicker">הספר שלכם</p>
      <h1>{book.title}</h1>
      <p className="author">
        {book.author} · {name} {convinced(personaId)}
      </p>
      <p className="pitch">{rec?.pitch ?? book.why}</p>
      {rec && <p className="jab">{rec.jab}</p>}
      <p className="note">
        הספר לא נמצא כאן בתוך האפליקציה. קונים אותו או שואלים בספרייה, ואז קוראים. הבחירה נשמרת על המדף במכשיר הזה.
      </p>
      <div className="row">
        <button className="primary" type="button" onClick={onBack}>
          חזרה לשלושה
        </button>
        <button className="ghost" type="button" onClick={onRestart}>
          סקר חדש
        </button>
      </div>
    </section>
  )
}
