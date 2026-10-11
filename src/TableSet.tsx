import { useMemo, useState } from 'react'
import { boardDefaults, type Board } from './board'
import { searchBooks, seedById, type Direction, type OriginChoice } from './engine/table'
import type { SeatDraft } from './storage'
import type { Heaviness, Life, Seek } from './types'

const weights: { value: Heaviness; label: string; height: number }[] = [
  { value: 'light', label: 'קלילה', height: 28 },
  { value: 'breathing', label: 'עם אוויר', height: 46 },
  { value: 'lasting', label: 'נשארת', height: 64 },
  { value: 'deep', label: 'תובענית', height: 84 },
]

const pulls: { value: Seek; label: string }[] = [
  { value: 'grip', label: 'לתפוס' },
  { value: 'feel', label: 'לגעת' },
  { value: 'lift', label: 'להרים' },
  { value: 'learn', label: 'ללמד' },
  { value: 'weird', label: 'להפתיע' },
]

const lives: { value: Life; label: string }[] = [
  { value: 'love', label: 'אהבה' },
  { value: 'family', label: 'משפחה' },
  { value: 'work', label: 'עבודה' },
  { value: 'society', label: 'בחוץ' },
  { value: 'loneliness', label: 'לבד' },
  { value: 'ideas', label: 'סקרנות' },
]

const voices: { value: OriginChoice; label: string }[] = [
  { value: 'original', label: 'מקור' },
  { value: 'translated', label: 'תרגום' },
  { value: 'either', label: 'שניהם' },
]

const distances: { value: Direction; label: string }[] = [
  { value: 'similar', label: 'קרוב' },
  { value: 'different', label: 'הצידה' },
  { value: 'surprise', label: 'רחוק' },
]

function boardFromDraft(draft: SeatDraft): Board {
  return {
    seedId: draft.seedId,
    direction: draft.direction ?? boardDefaults.direction,
    seek: draft.seek ?? boardDefaults.seek,
    heaviness: draft.heaviness ?? boardDefaults.heaviness,
    life: draft.life ?? boardDefaults.life,
    origin: draft.origin ?? boardDefaults.origin,
  }
}

export default function TableSet({
  draft,
  onDraft,
  onBack,
  onDone,
}: {
  draft: SeatDraft
  onDraft: (draft: SeatDraft) => void
  onBack: () => void
  onDone: (board: Board) => void
}) {
  const board = boardFromDraft(draft)
  const seed = seedById(board.seedId)
  const [query, setQuery] = useState('')
  const hits = useMemo(() => (seed ? [] : searchBooks(query, 6)), [query, seed])

  function patch(next: Partial<Board>) {
    const merged = { ...board, ...next }
    onDraft({
      seedId: merged.seedId,
      direction: merged.direction,
      seek: merged.seek,
      heaviness: merged.heaviness,
      life: merged.life,
      origin: merged.origin,
    })
  }

  return (
    <section className="board">
      <p className="kicker">השולחן</p>
      <h1>סדרו את השולחן.</h1>
      <p className="lede">נוגעים במה שחשוב. בלי שאלון.</p>

      <div className="board-block">
        <p className="board-label">הספר האחרון</p>
        {seed ? (
          <div className="seed-chip">
            <span>
              <strong>{seed.title}</strong>
              <small>{seed.author}</small>
            </span>
            <button type="button" onClick={() => patch({ seedId: null })}>
              בלי הספר
            </button>
          </div>
        ) : (
          <>
            <label className="sr" htmlFor="last-book">
              שם הספר או הסופר
            </label>
            <input
              id="last-book"
              className="search"
              value={query}
              autoComplete="off"
              placeholder="גרוסמן, או שם של ספר"
              onChange={(event) => setQuery(event.target.value)}
            />
            {query.trim().length >= 2 && hits.length === 0 && <p className="fine">אין ספר כזה ברשימה. אפשר להמשיך בלי.</p>}
            {hits.length > 0 && (
              <div className="seed-hits">
                {hits.map((hit) => (
                  <button key={hit.id} type="button" onClick={() => { setQuery(''); patch({ seedId: hit.id }) }}>
                    <strong>{hit.title}</strong>
                    <small>{[hit.author, hit.year].filter(Boolean).join(' · ')}</small>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
        {seed && (
          <div className="distance" role="group" aria-label="המרחק מהספר האחרון">
            {distances.map((item) => (
              <button key={item.value} type="button" className={board.direction === item.value ? 'on' : ''} aria-pressed={board.direction === item.value} onClick={() => patch({ direction: item.value })}>
                <span className={`dist dist-${item.value}`} aria-hidden="true" />
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="board-block">
        <p className="board-label">הכתיבה</p>
        <div className="spines" role="group" aria-label="משקל הכתיבה">
          {weights.map((item) => (
            <button key={item.value} type="button" className={board.heaviness === item.value ? 'on' : ''} aria-pressed={board.heaviness === item.value} onClick={() => patch({ heaviness: item.value })}>
              <span className="spine" style={{ height: item.height }} />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="board-block">
        <p className="board-label">המשיכה</p>
        <div className="picks" role="group" aria-label="מה מושך">
          {pulls.map((item) => (
            <button key={item.value} type="button" className={board.seek === item.value ? 'on' : ''} aria-pressed={board.seek === item.value} onClick={() => patch({ seek: item.value })}>
              <PullIcon id={item.value} />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="board-block">
        <p className="board-label">על השולחן</p>
        <div className="picks lives" role="group" aria-label="מה על השולחן">
          {lives.map((item) => (
            <button key={item.value} type="button" className={board.life === item.value ? 'on' : ''} aria-pressed={board.life === item.value} onClick={() => patch({ life: item.value })}>
              <LifeIcon id={item.value} />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="board-block">
        <p className="board-label">הקול</p>
        <div className="origins" role="group" aria-label="מקור או תרגום">
          {voices.map((item) => (
            <button key={item.value} type="button" className={board.origin === item.value ? 'on' : ''} aria-pressed={board.origin === item.value} onClick={() => patch({ origin: item.value })}>
              <span className="voice-spine" aria-hidden="true" />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="row">
        <button className="primary" type="button" onClick={() => onDone(board)}>
          שלושה ספרים
        </button>
        <button className="texty" type="button" onClick={onBack}>
          חזרה
        </button>
      </div>
    </section>
  )
}

function PullIcon({ id }: { id: Seek }) {
  if (id === 'grip') {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M7 9.5h7.2c1.4 2.2 1.4 10.8 0 13H7Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M25 9.5h-7.2c-1.4 2.2-1.4 10.8 0 13H25Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    )
  }
  if (id === 'feel') {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M16 26s-8.5-5.2-8.5-11.2A4.6 4.6 0 0 1 16 11a4.6 4.6 0 0 1 8.5 3.8C24.5 20.8 16 26 16 26Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    )
  }
  if (id === 'lift') {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M16 4.5v3.2M16 24.3v3.2M4.5 16h3.2M24.3 16h3.2M7.6 7.6l2.2 2.2M22.2 22.2l2.2 2.2M24.4 7.6l-2.2 2.2M9.8 22.2l-2.2 2.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    )
  }
  if (id === 'learn') {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M20.2 6.2 25.8 11.8 12.2 25.4H6.6v-5.6Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="m17.4 9 5.4 5.4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 5.5 18.2 13H26l-6.3 4.6 2.4 7.4L16 20.6 9.9 25l2.4-7.4L6 13h7.8Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

function LifeIcon({ id }: { id: Life }) {
  if (id === 'love') {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M16 25s-7.2-4.4-7.2-9.4a3.9 3.9 0 0 1 7.2-2.1 3.9 3.9 0 0 1 7.2 2.1C23.2 20.6 16 25 16 25Z" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    )
  }
  if (id === 'family') {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="11" cy="11" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="21" cy="11" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M6.5 23.5c.6-3 2.6-4.6 4.5-4.6s3.9 1.6 4.5 4.6M16.5 23.5c.6-3 2.6-4.6 4.5-4.6s3.9 1.6 4.5 4.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    )
  }
  if (id === 'work') {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <rect x="6" y="12" width="20" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12 12V9.5A2.5 2.5 0 0 1 14.5 7h3A2.5 2.5 0 0 1 20 9.5V12M6 17h20" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    )
  }
  if (id === 'society') {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M6 25.5h20M8 25.5V14l5-3.5V25.5M18 25.5V8l6 4v13.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    )
  }
  if (id === 'loneliness') {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="11" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M10.5 24.5c.8-3.4 2.8-5.2 5.5-5.2s4.7 1.8 5.5 5.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="14" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M13.2 24.5h5.6M16 20v4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
