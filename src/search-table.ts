import { seatFromBoard, boardDefaults, sofaFor } from './board'
import { isKnownTheme, themesByPopularity } from './data/readings'
import type { SeatAnswers } from './engine/seat'
import { fold, searchBooks, seedById, type Direction, type OriginChoice } from './engine/table'
import type { Heaviness, Life, Seek } from './types'

export const THEME_CAP = 4

export interface TableSearch {
  answers: SeatAnswers
  themes: string[]
}

export type Suggestion =
  | { kind: 'book'; id: string; title: string; author: string }
  | { kind: 'theme'; theme: string; count: number }
  | { kind: 'taste'; field: 'heaviness'; value: Heaviness; label: string }
  | { kind: 'taste'; field: 'seek'; value: Seek; label: string }
  | { kind: 'taste'; field: 'life'; value: Life; label: string }
  | { kind: 'taste'; field: 'origin'; value: Exclude<OriginChoice, 'either'>; label: string }
  | { kind: 'taste'; field: 'direction'; value: Direction; label: string }

export interface ActiveChip {
  key: string
  label: string
  clear: 'book' | 'theme' | 'heaviness' | 'seek' | 'life' | 'origin'
  theme?: string
}

export const distanceWords: { value: Direction; label: string }[] = [
  { value: 'similar', label: 'קרוב' },
  { value: 'different', label: 'הצידה' },
  { value: 'surprise', label: 'רחוק' },
]

const tastes: Suggestion[] = [
  { kind: 'taste', field: 'heaviness', value: 'light', label: 'כתיבה קלילה' },
  { kind: 'taste', field: 'heaviness', value: 'breathing', label: 'כתיבה עם אוויר' },
  { kind: 'taste', field: 'heaviness', value: 'lasting', label: 'כתיבה שנשארת' },
  { kind: 'taste', field: 'heaviness', value: 'deep', label: 'כתיבה תובענית' },
  { kind: 'taste', field: 'seek', value: 'grip', label: 'שתתפוס' },
  { kind: 'taste', field: 'seek', value: 'feel', label: 'שייגע' },
  { kind: 'taste', field: 'seek', value: 'lift', label: 'שירים' },
  { kind: 'taste', field: 'seek', value: 'learn', label: 'שילמד' },
  { kind: 'taste', field: 'seek', value: 'weird', label: 'שיפתיע' },
  { kind: 'taste', field: 'life', value: 'love', label: 'אהבה' },
  { kind: 'taste', field: 'life', value: 'family', label: 'משפחה' },
  { kind: 'taste', field: 'life', value: 'work', label: 'עבודה' },
  { kind: 'taste', field: 'life', value: 'society', label: 'המצב בחוץ' },
  { kind: 'taste', field: 'life', value: 'loneliness', label: 'בדידות' },
  { kind: 'taste', field: 'life', value: 'ideas', label: 'סקרנות' },
  { kind: 'taste', field: 'origin', value: 'original', label: 'מקור' },
  { kind: 'taste', field: 'origin', value: 'translated', label: 'תרגום' },
  { kind: 'taste', field: 'direction', value: 'similar', label: 'קרוב' },
  { kind: 'taste', field: 'direction', value: 'different', label: 'הצידה' },
  { kind: 'taste', field: 'direction', value: 'surprise', label: 'רחוק' },
]

const heavinessLabel: Record<Heaviness, string> = {
  light: 'כתיבה קלילה',
  breathing: 'כתיבה עם אוויר',
  lasting: 'כתיבה שנשארת',
  deep: 'כתיבה תובענית',
}

const seekLabel: Record<Seek, string> = {
  grip: 'שתתפוס',
  feel: 'שייגע',
  lift: 'שירים',
  learn: 'שילמד',
  weird: 'שיפתיע',
}

const lifeLabel: Record<Life, string> = {
  love: 'אהבה',
  family: 'משפחה',
  work: 'עבודה',
  society: 'המצב בחוץ',
  loneliness: 'בדידות',
  ideas: 'סקרנות',
}

const originLabel = { original: 'מקור', translated: 'תרגום' } as const

export function freshSearch(): TableSearch {
  return { answers: seatFromBoard(boardDefaults), themes: [] }
}

export function starterThemes(limit = 8): { theme: string; count: number }[] {
  return themesByPopularity().slice(0, limit).map((item) => ({ ...item }))
}

export function findSuggestions(query: string, options?: { seed?: boolean }): Suggestion[] {
  const needle = fold(query)
  if (needle.length < 2) return []
  const themes = themesByPopularity()
    .filter((item) => fold(item.theme).includes(needle))
    .map((item): Suggestion => ({ kind: 'theme', theme: item.theme, count: item.count }))
  const words = tastes.filter((item) => {
    if (item.kind !== 'taste') return false
    if (item.field === 'direction' && !options?.seed) return false
    return fold(item.label).includes(needle)
  })
  const books = searchBooks(query, 8).map(
    (seed): Suggestion => ({ kind: 'book', id: seed.id, title: seed.title, author: seed.author }),
  )
  return [...themes, ...words, ...books].slice(0, 8)
}

export function applySuggestion(current: TableSearch, suggestion: Suggestion): TableSearch {
  if (suggestion.kind === 'book') {
    const hadSeed = current.answers.seedId !== null
    return {
      themes: current.themes,
      answers: {
        ...current.answers,
        seedId: suggestion.id,
        direction: hadSeed ? current.answers.direction : 'different',
      },
    }
  }
  if (suggestion.kind === 'theme') {
    if (!isKnownTheme(suggestion.theme)) return current
    const has = current.themes.includes(suggestion.theme)
    if (has) return { ...current, themes: current.themes.filter((theme) => theme !== suggestion.theme) }
    if (current.themes.length >= THEME_CAP) return current
    return { ...current, themes: [...current.themes, suggestion.theme] }
  }
  if (suggestion.field === 'direction') {
    if (!current.answers.seedId) return current
    return { ...current, answers: { ...current.answers, direction: suggestion.value } }
  }
  if (suggestion.field === 'heaviness') {
    return { ...current, answers: { ...current.answers, heaviness: suggestion.value } }
  }
  if (suggestion.field === 'seek') {
    return { ...current, answers: { ...current.answers, seek: suggestion.value, sofa: sofaFor(suggestion.value) } }
  }
  if (suggestion.field === 'life') {
    return { ...current, answers: { ...current.answers, life: suggestion.value } }
  }
  return { ...current, answers: { ...current.answers, origin: suggestion.value } }
}

export function setDirection(current: TableSearch, direction: Direction): TableSearch {
  if (!current.answers.seedId) return current
  return { ...current, answers: { ...current.answers, direction } }
}

export function clearChip(
  current: TableSearch,
  chip: { kind: 'book' } | { kind: 'theme'; theme: string } | { kind: 'heaviness' | 'seek' | 'life' | 'origin' },
): TableSearch {
  if (chip.kind === 'book') {
    return { ...current, answers: { ...current.answers, seedId: null, direction: 'surprise' } }
  }
  if (chip.kind === 'theme') {
    return { ...current, themes: current.themes.filter((theme) => theme !== chip.theme) }
  }
  if (chip.kind === 'heaviness') {
    return { ...current, answers: { ...current.answers, heaviness: boardDefaults.heaviness } }
  }
  if (chip.kind === 'seek') {
    return { ...current, answers: { ...current.answers, seek: boardDefaults.seek, sofa: sofaFor(boardDefaults.seek) } }
  }
  if (chip.kind === 'life') {
    return { ...current, answers: { ...current.answers, life: boardDefaults.life } }
  }
  return { ...current, answers: { ...current.answers, origin: boardDefaults.origin } }
}

export function isTuned(current: TableSearch): boolean {
  return visibleChips(current).length > 0
}

export function visibleChips(current: TableSearch): ActiveChip[] {
  const chips: ActiveChip[] = []
  if (current.answers.seedId) {
    const seed = seedById(current.answers.seedId)
    chips.push({
      key: `book:${current.answers.seedId}`,
      label: seed?.title ?? 'הספר האחרון',
      clear: 'book',
    })
  }
  for (const theme of current.themes) {
    chips.push({ key: `theme:${theme}`, label: theme, clear: 'theme', theme })
  }
  if (current.answers.heaviness !== boardDefaults.heaviness) {
    chips.push({ key: 'heaviness', label: heavinessLabel[current.answers.heaviness], clear: 'heaviness' })
  }
  if (current.answers.seek !== boardDefaults.seek) {
    chips.push({ key: 'seek', label: seekLabel[current.answers.seek], clear: 'seek' })
  }
  if (current.answers.life !== boardDefaults.life) {
    chips.push({ key: 'life', label: lifeLabel[current.answers.life], clear: 'life' })
  }
  if (current.answers.origin !== boardDefaults.origin && current.answers.origin !== 'either') {
    chips.push({ key: 'origin', label: originLabel[current.answers.origin], clear: 'origin' })
  }
  return chips
}
