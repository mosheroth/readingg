import type { Answers } from '../types'

export interface Choice<K extends keyof Answers> {
  value: Answers[K]
  label: string
  hint: string
}

export interface Question<K extends keyof Answers = keyof Answers> {
  id: K
  title: string
  options: Choice<K>[]
}

export const questions: Question[] = [
  {
    id: 'seek',
    title: 'מה הספר הזה צריך לעשות לכם?',
    options: [
      { value: 'grip', label: 'לתפוס ולא לשחרר', hint: 'עוד פרק, וחבל על השינה' },
      { value: 'feel', label: 'לגעת, גם אם זה כואב', hint: 'משהו שנשאר בגוף' },
      { value: 'lift', label: 'להרים', hint: 'חום, צחוק, קצת אוויר' },
      { value: 'learn', label: 'ללמד משהו אמיתי', hint: 'על העולם, לא רק על דמות' },
      { value: 'weird', label: 'להפתיע', hint: 'שלא דומה למה שכבר קראתם' },
    ],
  },
  {
    id: 'heaviness',
    title: 'כמה מותר לו לשקול?',
    options: [
      { value: 'light', label: 'קליל', hint: 'שאפשר לגמור בסוף שבוע' },
      { value: 'breathing', label: 'יש לב, ויש אוויר', hint: 'לא בריחה, גם לא מטלה' },
      { value: 'lasting', label: 'שיישאר אחרי שסוגרים', hint: 'מותר שיהיה שם משקל' },
      { value: 'deep', label: 'תשקיעו בי', hint: 'אני פנוי לספר תובעני' },
    ],
  },
  {
    id: 'moment',
    title: 'מאיפה באים אל הספר הזה?',
    options: [
      { value: 'returning', label: 'חוזרים אחרי הפסקה', hint: 'שלא ייפול אחרי עשרים עמוד' },
      { value: 'regular', label: 'קוראים כל הזמן', hint: 'אפשר להפתיע' },
      { value: 'afterHeavy', label: 'גמרנו משהו כבד', hint: 'צריך אוויר' },
      { value: 'challenge', label: 'מוכנים לאתגר', hint: 'לא לחפש את הקל' },
    ],
  },
  {
    id: 'origin',
    title: 'איזה קול בא לכם לשמוע?',
    options: [
      { value: 'israel', label: 'ישראלי', hint: 'שפה, רחוב, משפחה מכאן' },
      { value: 'world', label: 'מהעולם', hint: 'תרגום, העיקר הסיפור' },
      { value: 'either', label: 'לא אכפת', hint: 'שיהיה הספר הנכון' },
    ],
  },
  {
    id: 'life',
    title: 'מה תופס את החיים עכשיו?',
    options: [
      { value: 'love', label: 'אהבה', hint: 'מה נשבר ומה נשאר' },
      { value: 'family', label: 'משפחה', hint: 'הבית, ומי שאנחנו בתוכו' },
      { value: 'work', label: 'עבודה', hint: 'הצלחה, והאם היא שווה' },
      { value: 'society', label: 'המצב בחוץ', hint: 'פוליטיקה, צדק, חדשות' },
      { value: 'loneliness', label: 'התחלה חדשה', hint: 'בדידות, או דף חלק' },
      { value: 'ideas', label: 'סקרנות', hint: 'איך הדברים עובדים' },
    ],
  },
  {
    id: 'sofa',
    title: 'איך נראית קריאה טובה על הספה?',
    options: [
      { value: 'devour', label: 'עוד פרק אחד', hint: 'עד שנגמר, או עד שלוש' },
      { value: 'quiet', label: 'שקט יפה', hint: 'לאט, עם מקום לנשום' },
      { value: 'mystery', label: 'שתהיה תעלומה', hint: 'בלי שאלה אין קריאה' },
      { value: 'underline', label: 'עם עיפרון', hint: 'לסמן שורה ולחזור אליה' },
    ],
  },
]
