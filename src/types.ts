export type Origin = 'israel' | 'world'
export type Pace = 'fast' | 'medium' | 'slow'
export type Weight = 'light' | 'medium' | 'heavy'
export type Length = 'short' | 'medium' | 'long'
export type Genre =
  | 'literary'
  | 'thriller'
  | 'mystery'
  | 'sf'
  | 'fantasy'
  | 'humor'
  | 'nonfiction'
  | 'memoir'
  | 'romance'
  | 'history'

export type Mood = 'tender' | 'dark' | 'funny' | 'sharp' | 'hopeful' | 'weird' | 'suspense' | 'quiet'
export type Theme = 'love' | 'family' | 'work' | 'society' | 'loneliness' | 'ideas' | 'adventure' | 'identity'

export type Seek = 'grip' | 'feel' | 'lift' | 'learn' | 'weird'
export type Heaviness = 'light' | 'breathing' | 'lasting' | 'deep'
export type Moment = 'returning' | 'regular' | 'afterHeavy' | 'challenge'
export type OriginPref = 'israel' | 'world' | 'either'
export type Life = 'love' | 'family' | 'work' | 'society' | 'loneliness' | 'ideas'
export type Sofa = 'devour' | 'quiet' | 'mystery' | 'underline'

export interface Answers {
  seek: Seek
  heaviness: Heaviness
  moment: Moment
  origin: OriginPref
  life: Life
  sofa: Sofa
}

export interface Book {
  id: string
  title: string
  author: string
  year: number
  origin: Origin
  fiction: boolean
  genres: Genre[]
  moods: Mood[]
  themes: Theme[]
  pace: Pace
  weight: Weight
  length: Length
  /** Original two-sentence case for the book. Not a publisher blurb. */
  why: string
}

export interface Persona {
  id: 'yael' | 'tom' | 'nadav'
  name: string
  role: string
  stance: string
}

export interface Recommendation {
  persona: Persona
  book: Book
  score: number
  reasons: string[]
  pitch: string
  jab: string
}
