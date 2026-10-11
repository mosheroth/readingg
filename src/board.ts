import type { SeatAnswers } from './engine/seat'
import type { Direction, OriginChoice } from './engine/table'
import type { Heaviness, Life, Seek, Sofa } from './types'

export interface Board {
  seedId: string | null
  direction: Direction
  seek: Seek
  heaviness: Heaviness
  life: Life
  origin: OriginChoice
}

export const boardDefaults: Board = {
  seedId: null,
  direction: 'different',
  seek: 'feel',
  heaviness: 'breathing',
  life: 'family',
  origin: 'either',
}

/** The sofa question folded into the pull, so the table does not ask it again. */
export function sofaFor(seek: Seek): Sofa {
  if (seek === 'grip' || seek === 'lift') return 'devour'
  if (seek === 'learn') return 'underline'
  return 'quiet'
}

export function seatFromBoard(board: Board): SeatAnswers {
  return {
    seedId: board.seedId,
    direction: board.seedId ? board.direction : 'surprise',
    seek: board.seek,
    heaviness: board.heaviness,
    moment: 'regular',
    life: board.life,
    sofa: sofaFor(board.seek),
    origin: board.origin,
  }
}
