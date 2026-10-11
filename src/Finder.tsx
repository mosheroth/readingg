import { useId, useState } from 'react'
import { fold } from './engine/table'
import type { SeatAnswers } from './engine/seat'
import {
  applySuggestion,
  clearChip,
  distanceWords,
  findSuggestions,
  setDirection,
  starterThemes,
  visibleChips,
  type ActiveChip,
  type TableSearch,
} from './search-table'

export default function Finder({
  answers,
  themes,
  onChange,
}: {
  answers: SeatAnswers
  themes: string[]
  onChange: (next: TableSearch) => void
}) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const listId = useId()
  const current = { answers, themes }
  const suggestions = findSuggestions(query, { seed: answers.seedId !== null })
  const needle = fold(query)
  const chips = visibleChips(current)
  const starters = themes.length === 0 && needle.length < 2 ? starterThemes() : []
  const showList = needle.length >= 2

  function take(index: number) {
    const suggestion = suggestions[index]
    if (!suggestion) return
    onChange(applySuggestion(current, suggestion))
    setQuery('')
    setActive(0)
  }

  return (
    <div className="finder">
      <label className="sr" htmlFor={`${listId}-q`}>
        ספר, נושא, או תחושה
      </label>
      <input
        id={`${listId}-q`}
        className="search"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={`${listId}-list`}
        aria-activedescendant={showList && suggestions[active] ? `${listId}-${active}` : undefined}
        placeholder="ספר, נושא, או תחושה"
        autoComplete="off"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setActive(0)
        }}
        onKeyDown={(event) => {
          if (!showList || suggestions.length === 0) {
            if (event.key === 'Escape') setQuery('')
            return
          }
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setActive((index) => (index + 1) % suggestions.length)
          } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            setActive((index) => (index - 1 + suggestions.length) % suggestions.length)
          } else if (event.key === 'Enter') {
            event.preventDefault()
            take(active)
          } else if (event.key === 'Escape') {
            setQuery('')
          }
        }}
      />
      {showList && suggestions.length > 0 && (
        <ul className="suggest" id={`${listId}-list`} role="listbox">
          {suggestions.map((suggestion, index) => (
            <li key={suggestionKey(suggestion)}>
              <button
                id={`${listId}-${index}`}
                type="button"
                role="option"
                aria-selected={index === active}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActive(index)}
                onClick={() => take(index)}
              >
                <SuggestionLine suggestion={suggestion} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {showList && suggestions.length === 0 && <p className="suggest-empty">אין ספר, נושא או תחושה כאלה.</p>}
      {starters.length > 0 && (
        <div className="starters">
          <p className="finder-label">אפשר לפתוח בנושא</p>
          <ul>
            {starters.map((item) => (
              <li key={item.theme}>
                <button
                  type="button"
                  onClick={() => onChange(applySuggestion(current, { kind: 'theme', theme: item.theme, count: item.count }))}
                >
                  <Hash theme={item.theme} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {chips.length > 0 && (
        <div className="filters" aria-label="מה שעל השולחן">
          {chips.map((chip) =>
            chip.clear === 'book' ? (
              <div key={chip.key} className="book-chip">
                <span className="book-chip-title">{chip.label}</span>
                <span className="dists" role="group" aria-label="מרחק מהספר">
                  {distanceWords.map((word) => (
                    <button
                      key={word.value}
                      type="button"
                      className={answers.direction === word.value ? 'on' : ''}
                      aria-pressed={answers.direction === word.value}
                      onClick={() => onChange(setDirection(current, word.value))}
                    >
                      {word.label}
                    </button>
                  ))}
                </span>
                <button type="button" className="chip-x" aria-label={`הסרת ${chip.label}`} onClick={() => onChange(clearChip(current, { kind: 'book' }))}>
                  ×
                </button>
              </div>
            ) : (
              <button
                key={chip.key}
                type="button"
                className={chip.clear === 'theme' ? 'filter theme' : 'filter'}
                onClick={() => onChange(dropChip(current, chip))}
              >
                {chip.clear === 'theme' ? <Hash theme={chip.label} /> : chip.label}
                <span className="chip-x" aria-hidden="true">×</span>
                <span className="sr">הסרה</span>
              </button>
            ),
          )}
        </div>
      )}
    </div>
  )
}

function Hash({ theme }: { theme: string }) {
  return (
    <>
      <span aria-hidden="true">#</span>
      {theme}
    </>
  )
}

function dropChip(current: TableSearch, chip: ActiveChip): TableSearch {
  if (chip.clear === 'book') return clearChip(current, { kind: 'book' })
  if (chip.clear === 'theme') return chip.theme ? clearChip(current, { kind: 'theme', theme: chip.theme }) : current
  return clearChip(current, { kind: chip.clear })
}

function suggestionKey(suggestion: ReturnType<typeof findSuggestions>[number]): string {
  if (suggestion.kind === 'book') return `book:${suggestion.id}`
  if (suggestion.kind === 'theme') return `theme:${suggestion.theme}`
  return `taste:${suggestion.field}:${suggestion.value}`
}

function SuggestionLine({ suggestion }: { suggestion: ReturnType<typeof findSuggestions>[number] }) {
  if (suggestion.kind === 'book') {
    return (
      <>
        <strong>{suggestion.title}</strong>
        <small>
          {suggestion.author} · ספר שקראתם
        </small>
      </>
    )
  }
  if (suggestion.kind === 'theme') {
    return (
      <>
        <strong>
          <Hash theme={suggestion.theme} />
        </strong>
        <small>{suggestion.count} ספרים על השולחן</small>
      </>
    )
  }
  return (
    <>
      <strong>{suggestion.label}</strong>
      <small>תחושה</small>
    </>
  )
}
