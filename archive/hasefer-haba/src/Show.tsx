import { useState } from 'react'
import { descriptionLead, type DisputedBook } from './engine/table'

function factList(book: DisputedBook): string[] {
  const shelf = book.subcategory || book.category
  const origin =
    book.origin === 'original' ? 'מקור' : book.origin === 'translated' ? (book.translator ? `תרגום: ${book.translator}` : 'תרגום') : ''
  const year = book.year ? `יצא ב־${book.year}` : ''
  return [book.author, year, shelf, origin].filter((item): item is string => Boolean(item))
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

export function BookFacts({ book, part = 'all' }: { book: DisputedBook; part?: 'all' | 'facts' | 'blurb' }) {
  const [open, setOpen] = useState(false)
  const facts = factList(book)
  const { lead, rest } = descriptionLead(book.description)
  return (
    <>
      {part !== 'blurb' && facts.length > 0 && (
        <ul className="facts">
          {facts.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
      )}
      {part !== 'facts' && lead && (
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
