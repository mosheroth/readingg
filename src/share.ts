import { isKnownTheme } from './data/readings'
import type { SeatAnswers } from './engine/seat'
import type { Session } from './storage'
import type { Heaviness, Life, Moment, Seek, Sofa } from './types'
import type { Direction, OriginChoice } from './engine/table'

const VERSION = '1'

const directions = ['similar', 'different', 'surprise'] as const satisfies readonly Direction[]
const seeks = ['grip', 'feel', 'lift', 'learn', 'weird'] as const satisfies readonly Seek[]
const heavinesses = ['light', 'breathing', 'lasting', 'deep'] as const satisfies readonly Heaviness[]
const moments = ['returning', 'regular', 'afterHeavy', 'challenge'] as const satisfies readonly Moment[]
const lives = ['love', 'family', 'work', 'society', 'loneliness', 'ideas'] as const satisfies readonly Life[]
const sofas = ['devour', 'quiet', 'mystery', 'underline'] as const satisfies readonly Sofa[]
const origins = ['original', 'translated', 'either'] as const satisfies readonly OriginChoice[]

const ID = /^\d{1,16}$/
const SKIP_LIMIT = 24
const THEME_LIMIT = 4

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | null {
  if (!value) return null
  return (allowed as readonly string[]).includes(value) ? (value as T) : null
}

function bookId(value: string | null): string | null {
  if (!value || !ID.test(value)) return null
  return value
}

export function encodeResult(session: Extract<Session, { name: 'results' | 'chosen' }>): string {
  const params = new URLSearchParams()
  params.set('v', VERSION)
  if (session.answers.seedId) params.set('seed', session.answers.seedId)
  params.set('direction', session.answers.direction)
  params.set('seek', session.answers.seek)
  params.set('heaviness', session.answers.heaviness)
  params.set('moment', session.answers.moment)
  params.set('life', session.answers.life)
  params.set('sofa', session.answers.sofa)
  params.set('origin', session.answers.origin)
  if (session.exclude.length > 0) params.set('skip', session.exclude.join(','))
  const themes = (session.themes ?? []).filter((theme, index, all) => isKnownTheme(theme) && all.indexOf(theme) === index).slice(0, THEME_LIMIT)
  if (themes.length > 0) params.set('theme', themes.join(','))
  if (session.name === 'chosen') params.set('pick', session.bookId)
  return params.toString()
}

function themesFrom(raw: string | null): string[] {
  if (!raw) return []
  const themes: string[] = []
  for (const part of raw.split(',')) {
    const theme = part.trim()
    if (!theme || themes.includes(theme) || !isKnownTheme(theme)) continue
    themes.push(theme)
    if (themes.length === THEME_LIMIT) break
  }
  return themes
}

export function decodeResult(search: string): Session | null {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  if (params.get('v') !== VERSION) return null
  const direction = oneOf(params.get('direction'), directions)
  const seek = oneOf(params.get('seek'), seeks)
  const heaviness = oneOf(params.get('heaviness'), heavinesses)
  const moment = oneOf(params.get('moment'), moments)
  const life = oneOf(params.get('life'), lives)
  const sofa = oneOf(params.get('sofa'), sofas)
  const origin = oneOf(params.get('origin'), origins)
  if (!direction || !seek || !heaviness || !moment || !life || !sofa || !origin) return null

  const seedRaw = params.get('seed')
  const seedId = seedRaw ? bookId(seedRaw) : null
  if (seedRaw && !seedId) return null

  const skipRaw = params.get('skip')
  const exclude = skipRaw ? skipRaw.split(',').filter((item) => item.length > 0) : []
  if (exclude.length > SKIP_LIMIT || exclude.some((item) => !ID.test(item))) return null

  const answers: SeatAnswers = { seedId, direction, seek, heaviness, moment, life, sofa, origin }
  const themes = themesFrom(params.get('theme'))
  const pickRaw = params.get('pick')
  if (!pickRaw) return themes.length > 0 ? { name: 'results', answers, exclude, themes } : { name: 'results', answers, exclude }
  const pick = bookId(pickRaw)
  if (!pick) return null
  return themes.length > 0
    ? { name: 'chosen', answers, exclude, themes, bookId: pick, personaId: 'table' }
    : { name: 'chosen', answers, exclude, bookId: pick, personaId: 'table' }
}

export function resultLocation(session: Session, basePath: string): string {
  const path = basePath.endsWith('/') ? basePath : `${basePath}/`
  const url = new URL(path, 'https://share.local')
  if (session.name === 'results' || session.name === 'chosen') url.search = encodeResult(session)
  else url.search = ''
  return `${url.pathname}${url.search}`
}

export function syncResultUrl(session: Session): void {
  const next = resultLocation(session, import.meta.env.BASE_URL || '/')
  const current = `${window.location.pathname}${window.location.search}`
  if (current === next) return
  if (session.name === 'results' || session.name === 'chosen') window.history.pushState(null, '', next)
  else window.history.replaceState(null, '', next)
}
