import { useEffect, useMemo, useState } from 'react'
import { descriptionLead, searchBooks, seedById, type CatalogSeed, type Direction, type DisputedBook } from './engine/table'

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

function factList(book: DisputedBook): string[] {
  const shelf = book.subcategory || book.category
  const origin =
    book.origin === 'original' ? 'מקור' : book.origin === 'translated' ? (book.translator ? `תרגום: ${book.translator}` : 'תרגום') : ''
  return [book.author, shelf, origin].filter((item): item is string => Boolean(item))
}

export function Cover({ src }: { src: string }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) return <span className="card-cover card-cover-fallback" aria-hidden="true" />
  return <img className="card-cover" src={src} alt="" onError={() => setFailed(true)} />
}

export function BookScore({ book }: { book: DisputedBook }) {
  const score = book.avgRating == null ? '' : `${formatScore(book.avgRating)} מתוך 5`
  const count = book.simaniaReviewCount == null ? '' : `${book.simaniaReviewCount.toLocaleString('he-IL')} ביקורות בסימניה`
  const line = [score, count].filter(Boolean).join(' · ')
  if (!line) return null
  return <p className="score">{line}</p>
}

function formatScore(value: number): string {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

export function AlsoBooks({ book }: { book: DisputedBook }) {
  const people = book.advocates
  if (people.length === 0) return null
  if (people.length === 1) {
    const person = people[0]
    return (
      <div className="also">
        <p className="also-kicker">עוד ספרים של {person.reviewer}</p>
        <AlsoList person={person} />
      </div>
    )
  }
  return (
    <div className="also">
      <p className="also-kicker">עוד ספרים שהמליצו עליהם</p>
      {people.map((person) => (
        <div key={`${person.reviewer}-${person.also[0]?.id}`}>
          <p className="also-name">{person.reviewer}</p>
          <AlsoList person={person} />
        </div>
      ))}
    </div>
  )
}

function AlsoList({ person }: { person: DisputedBook['advocates'][number] }) {
  return (
    <ul>
      {person.also.map((item) => (
        <li key={item.id}>
          <a href={item.url} target="_blank" rel="noreferrer">
            {item.title}
          </a>
          {item.author ? <span> · {item.author}</span> : null}
        </li>
      ))}
      {person.more > 0 && <li className="also-more">ועוד {person.more} ספרים</li>}
    </ul>
  )
}

export function BookFacts({ book }: { book: DisputedBook }) {
  const [open, setOpen] = useState(false)
  const facts = factList(book)
  const { lead, rest } = descriptionLead(book.description)
  return (
    <>
      {facts.length > 0 && (
        <ul className="facts">
          {facts.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
      )}
      {lead && (
        <div className="blurb">
          <p>{open && rest ? `${lead}\n${rest}` : lead}</p>
          {rest && (
            <button className="expand" type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
              {open ? 'פחות' : 'MORE'}
            </button>
          )}
        </div>
      )}
    </>
  )
}

