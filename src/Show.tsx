import { useEffect, useMemo, useState } from 'react'
import {
  bookByTableId,
  searchBooks,
  seedById,
  tableSummary,
  type CatalogSeed,
  type Direction,
  type DisputedBook,
  type OriginChoice,
  type TableAnswers,
} from './engine/table'

export function BookStep({ onPick, onSkip, onBack }: { onPick: (seed: CatalogSeed) => void; onSkip: () => void; onBack: () => void }) {
  const [query, setQuery] = useState('')
  const hits = useMemo(() => searchBooks(query), [query])
  return (
    <section className="quiz">
      <h1>מה הספר האחרון שקראת?</h1>
      <p className="lede">מחפשים לפי שם הספר או הסופר, מתוך מה שכבר עלה אצלנו בביקורות.</p>
      <label className="sr" htmlFor="last-book">
        שם הספר או הסופר
      </label>
      <input
        id="last-book"
        className="search"
        value={query}
        autoComplete="off"
        placeholder="למשל: גרוסמן, או שם של ספר"
        onChange={(event) => setQuery(event.target.value)}
      />
      {query.trim().length >= 2 && hits.length === 0 && <p className="fine">אין ספר כזה ברשימה.</p>}
      <div className="options">
        {hits.map((hit) => (
          <button key={hit.id} className="option" type="button" onClick={() => onPick(hit)}>
            <span>
              <strong>{hit.title}</strong>
              <small>{[hit.author, hit.year].filter(Boolean).join(' · ')}</small>
            </span>
          </button>
        ))}
      </div>
      <div className="row">
        <button className="texty" type="button" onClick={onSkip}>
          הספר לא ברשימה, נמשיך בלי
        </button>
        <button className="texty" type="button" onClick={onBack}>
          חזרה
        </button>
      </div>
    </section>
  )
}

function useNumberKeys(options: { value: string }[], onChoose: (value: string) => void, onBack: () => void) {
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
}

export function DirectionStep({
  seedId,
  onChoose,
  onBack,
}: {
  seedId: string | null
  onChoose: (value: Direction) => void
  onBack: () => void
}) {
  const seed = seedById(seedId)
  const options: { value: Direction; label: string; hint: string }[] = seed
    ? [
        { value: 'similar', label: 'עוד מאותו עולם', hint: `קרוב אל «${seed.title}»` },
        { value: 'different', label: 'אותו מדף, כיוון אחר', hint: 'לא עוד ספר שנראה כמו הקודם' },
        { value: 'surprise', label: 'תוציאו אותי משם', hint: 'משהו שלא הייתם שמים ליד הספר הזה' },
      ]
    : [
        { value: 'similar', label: 'ספר שאנשים ישבו לכתוב עליו', hint: 'שתי הביקורות הארוכות' },
        { value: 'different', label: 'הוויכוח הכי חד', hint: 'הפער הכי גדול בין האוהב למתנגד' },
        { value: 'surprise', label: 'שלושה עולמות שונים', hint: 'כל ספר ממקום אחר במדף' },
      ]
  useNumberKeys(options, (value) => onChoose(value as Direction), onBack)
  return (
    <section className="quiz">
      <h1>{seed ? 'לאן להמשיך משם?' : 'איזה ויכוח לשים על השולחן?'}</h1>
      {seed && (
        <p className="lede">
          אחרי «{seed.title}»
          {seed.author ? ` של ${seed.author}` : ''}.
        </p>
      )}
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

export function OriginStep({ onChoose, onBack }: { onChoose: (value: OriginChoice) => void; onBack: () => void }) {
  const options: { value: OriginChoice; label: string; hint: string }[] = [
    { value: 'original', label: 'ספרות מקור', hint: 'נכתב בעברית' },
    { value: 'translated', label: 'מתורגם', hint: 'הגיע משפה אחרת' },
    { value: 'either', label: 'לא משנה', hint: 'הויכוח יותר חשוב מהמדף' },
  ]
  useNumberKeys(options, (value) => onChoose(value as OriginChoice), onBack)
  return (
    <section className="quiz">
      <h1>מקור או תרגום?</h1>
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

export function ShowDebate() {
  return (
    <section className="debate" aria-live="polite">
      <p className="kicker">רגע</p>
      <h1>מחפשים ספר שיש עליו ויכוח.</h1>
      <p className="lede">לא ממוצע גבוה. ספר שמישהו אהב, ומישהו אחר דחה.</p>
    </section>
  )
}

function metaLine(book: DisputedBook): string {
  return [book.author, book.year, book.subcategory, book.pages ? `${book.pages} עמודים` : '']
    .filter(Boolean)
    .join(' · ')
}

function Cover({ src }: { src: string }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) return <div className="cover-fallback" aria-hidden="true" />
  return <img className="fight-cover" src={src} alt="" onError={() => setFailed(true)} />
}

function Voices({ book }: { book: DisputedBook }) {
  return (
    <div className="voices">
      <blockquote className="voice voice-good">
        <p className="voice-tag">
          בעד · {book.praise.reviewer} · דירוג {book.praise.rating} מתוך 5
        </p>
        <p>{book.praise.excerpt}</p>
        <a href={book.praise.url} target="_blank" rel="noreferrer">
          הביקורת בסימניה
        </a>
      </blockquote>
      <blockquote className="voice voice-bad">
        <p className="voice-tag">
          נגד · {book.dissent.reviewer} · דירוג {book.dissent.rating} מתוך 5
        </p>
        <p>{book.dissent.excerpt}</p>
        <a href={book.dissent.url} target="_blank" rel="noreferrer">
          הביקורת בסימניה
        </a>
      </blockquote>
    </div>
  )
}

export function ShowResults({
  answers,
  picks,
  canReroll,
  onChoose,
  onReroll,
  onRestart,
}: {
  answers: TableAnswers
  picks: DisputedBook[]
  canReroll: boolean
  onChoose: (book: DisputedBook) => void
  onReroll: () => void
  onRestart: () => void
}) {
  return (
    <section className="results">
      <p className="kicker">שלושה ספרים על השולחן</p>
      <h1>על כל אחד יש מי שבעד ומי שנגד.</h1>
      <p className="summary">{tableSummary(answers)}</p>
      <div className="fights">
        {picks.map((book) => (
          <article key={book.id} className="card fight-card">
            <div className="fight-head">
              <Cover src={book.coverUrl} />
              <div>
                <h2>{book.title}</h2>
                <p className="meta">{metaLine(book)}</p>
              </div>
            </div>
            <Voices book={book} />
            <button className="primary" type="button" onClick={() => onChoose(book)}>
              זה הספר
            </button>
          </article>
        ))}
      </div>
      <p className="fine">הציטוטים מסימניה, מקוצרים. הביקורת המלאה נפתחת שם. הספר עצמו לא יושב כאן.</p>
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

export function ShowChosen({
  bookId,
  onBack,
  onRestart,
}: {
  bookId: string
  onBack: () => void
  onRestart: () => void
}) {
  const book = bookByTableId(bookId)
  if (!book) {
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
    <section className="chosen wide">
      <p className="kicker">הספר שלכם</p>
      <div className="fight-head">
        <Cover src={book.coverUrl} />
        <div>
          <h1>{book.title}</h1>
          <p className="author">{metaLine(book)}</p>
        </div>
      </div>
      <Voices book={book} />
      <p className="note">
        הספר לא נמצא כאן בתוך האפליקציה. קונים אותו או שואלים בספרייה, ואז קוראים. הבחירה נשמרת על המדף במכשיר הזה.
      </p>
      <div className="row">
        <a className="primary linkish" href={book.bookUrl} target="_blank" rel="noreferrer">
          לעמוד הספר בסימניה
        </a>
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
