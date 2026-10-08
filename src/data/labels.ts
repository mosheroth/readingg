import type { Answers, Genre, Length, Life, Origin, Seek, Theme } from '../types'

export const genreLabel: Record<Genre, string> = {
  literary: 'ספרות',
  thriller: 'מתח',
  mystery: 'בלשות',
  sf: 'מדע בדיוני',
  fantasy: 'פנטזיה',
  humor: 'הומור',
  nonfiction: 'עיון',
  memoir: 'זיכרון',
  romance: 'אהבה',
  history: 'היסטוריה',
}

export const lengthLabel: Record<Length, string> = {
  short: 'ערב אחד',
  medium: 'כמה ערבים',
  long: 'נשארים איתו',
}

export const originLabel: Record<Origin, string> = {
  israel: 'קול ישראלי',
  world: 'מהעולם',
}

const seekPhrase: Record<Seek, string> = {
  grip: 'חיפשתם ספר שתופס ולא עוזב',
  feel: 'חיפשתם משהו שייגע, לא רק שיעביר את הערב',
  lift: 'חיפשתם ספר שירים אתכם',
  learn: 'חיפשתם ללמוד משהו אמיתי',
  weird: 'חיפשתם משהו שלא דומה למה שכבר קראתם',
}

const lifePhrase: Record<Life, string> = {
  love: 'ואהבה היא מה שתופס אתכם עכשיו',
  family: 'ומשפחה היא מה שתופס אתכם עכשיו',
  work: 'ושאלות של עבודה והצלחה איתכם בחדר',
  society: 'והמצב בחוץ לא יוצא לכם מהראש',
  loneliness: 'ואתם במקום של התחלה, או של בדידות',
  ideas: 'וסקרנות ורעיונות הם מה שמזיז אתכם',
}

const lifeChip: Record<Life, string> = {
  love: 'על אהבה',
  family: 'על משפחה',
  work: 'על עבודה',
  society: 'על החברה',
  loneliness: 'על בדידות',
  ideas: 'על רעיונות',
}

export function openingLine(answers: Answers): string {
  return `${seekPhrase[answers.seek]}, ${lifePhrase[answers.life]}.`
}

export function summaryLine(answers: Answers): string {
  const seek: Record<Seek, string> = {
    grip: 'שתתפוס',
    feel: 'שייגע',
    lift: 'שירים',
    learn: 'שילמד',
    weird: 'שיפתיע',
  }
  const weight = {
    light: 'קליל',
    breathing: 'עם אוויר',
    lasting: 'שיישאר',
    deep: 'תובעני',
  }[answers.heaviness]
  const origin = {
    israel: 'ישראלי',
    world: 'מהעולם',
    either: 'מכל מקום',
  }[answers.origin]
  return `${seek[answers.seek]} · ${weight} · ${origin} · ${lifeChip[answers.life]}`
}

export function reasonChips(bookThemes: Theme[], bookOrigin: Origin, answers: Answers, genres: Genre[], pace: string): string[] {
  const chips: string[] = []
  if (answers.origin === 'israel' && bookOrigin === 'israel') chips.push('קול ישראלי')
  if (answers.origin === 'world' && bookOrigin === 'world') chips.push('מהעולם')
  if (bookThemes.includes(answers.life)) chips.push(lifeChip[answers.life])
  if (answers.heaviness === 'light') chips.push('לא כבד')
  if (answers.heaviness === 'deep') chips.push('יש בו משקל')
  if (answers.seek === 'grip' && pace === 'fast') chips.push('קשה להניח')
  if (answers.seek === 'weird') chips.push('לא שגרתי')
  if (answers.sofa === 'mystery' && (genres.includes('mystery') || genres.includes('thriller'))) chips.push('יש תעלומה')
  if (answers.sofa === 'underline' && (genres.includes('literary') || genres.includes('nonfiction'))) chips.push('אפשר לסמן שורות')
  if (answers.seek === 'lift' && genres.includes('humor')) chips.push('יש בו צחוק')
  return [...new Set(chips)].slice(0, 3)
}
