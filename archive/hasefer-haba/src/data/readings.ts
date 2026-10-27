import type { Life, Seek } from '../types'

/** How heavy the writing feels. Not the page count. */
export type ProseWeight = 1 | 2 | 3 | 4

export type ReadingWorld = Life | 'suspense' | 'faith' | 'history' | 'strange'

/**
 * One stored pass over the Simania blurb and the two reviews already in the catalog.
 * The site never calls a model. A new disputed book needs one new row; the rest stay put.
 */
export interface BookReading {
  prose: ProseWeight
  pull: Seek
  worlds: ReadingWorld[]
  about: string
  /** Specific themes from the blurb. Each one is shared by at least two books. */
  themes: string[]
}

export const proseLabel: Record<ProseWeight, string> = {
  1: 'קלילה',
  2: 'עם לב ואוויר',
  3: 'שנשארת אחרי שסוגרים',
  4: 'תובענית',
}

export const worldLabel: Record<ReadingWorld, string> = {
  love: 'אהבה',
  family: 'משפחה',
  work: 'עבודה',
  society: 'המצב בחוץ',
  loneliness: 'בדידות',
  ideas: 'סקרנות',
  suspense: 'מתח',
  faith: 'אמונה',
  history: 'היסטוריה',
  strange: 'עולם לא שגרתי',
}

export const readings: Record<string, BookReading> = {
  '1000297': {
    prose: 4,
    pull: 'weird',
    worlds: ['faith', 'ideas', 'strange'],
    about: 'גבר שמאמין שהאינסוף מדבר דרכו, בין נבואה, חובות ושיגעון',
    themes: ['אמונה', 'זהות'],
  },
  '1001156': {
    prose: 1,
    pull: 'feel',
    worlds: ['love', 'loneliness'],
    about: 'חתול יוצא עם בעליו למסע ביפן, ומתברר שזו פרידה',
    themes: ['פרידה', 'חיות מחמד', 'מסע'],
  },
  '1005415': {
    prose: 2,
    pull: 'lift',
    worlds: ['work', 'love', 'society'],
    about: 'כימאית בשנות השישים מאבדת הכול ומוצאת קול בתוכנית בישול',
    themes: ['נשים בעבודה', 'אוכל', 'אהבה לא שגרתית'],
  },
  '1006659': {
    prose: 3,
    pull: 'weird',
    worlds: ['strange', 'family', 'society'],
    about: 'עולם שנשבר שוב ושוב, ואנשים עם כוח שההמון רוצה להשמיד',
    themes: ['עולם שנשבר', 'פנטזיה', 'אמהות ובנות'],
  },
  '1008917': {
    prose: 2,
    pull: 'grip',
    worlds: ['history', 'faith', 'family'],
    about: 'הדסה נתלשת מחייה כשהמלך בפרס מחפש מלכה חדשה',
    themes: ['חצר מלכות', 'מקרא', 'חתונה'],
  },
  '1012772': {
    prose: 1,
    pull: 'grip',
    worlds: ['suspense', 'family'],
    about: 'רוצח סדרתי מעביר את השבויה שלו לבית החדש, עם בתו',
    themes: ['חטיפה', 'אבות ובנות', 'סוד בבית'],
  },
  '1012903': {
    prose: 2,
    pull: 'weird',
    worlds: ['strange', 'ideas'],
    about: 'ילדים רודפים אחרי מדליון, בין טרולים לבינה שמנהלת אי',
    themes: ['פנטזיה', 'אחים', 'מדע'],
  },
  '1013486': {
    prose: 3,
    pull: 'feel',
    worlds: ['love', 'society', 'loneliness'],
    about: 'אהבה בין שני גברים בפולין הקומוניסטית, מסופרת מניו יורק',
    themes: ['אהבה אסורה', 'משטר'],
  },
  '1013507': {
    prose: 1,
    pull: 'grip',
    worlds: ['suspense', 'work'],
    about: 'עוזרת בית נכנסת לבית נוצץ ומגלה סודות מסוכנים משלה',
    themes: ['סוד בבית', 'נשים בעבודה', 'שקרים'],
  },
  '1013868': {
    prose: 1,
    pull: 'grip',
    worlds: ['suspense'],
    about: 'שתי זרות בבר מחליטות לרצוח זו לזו את מי שהרס להן את החיים',
    themes: ['נקמה', 'רצח'],
  },
  '1014061': {
    prose: 4,
    pull: 'feel',
    worlds: ['family', 'love'],
    about: 'אחות ליד מיטת אחיה הגוסס, מואשמת שאהבתה הביאה את האסון',
    themes: ['אחים', 'אהבה אסורה', 'שתיקה'],
  },
  '1014471': {
    prose: 2,
    pull: 'grip',
    worlds: ['love', 'work'],
    about: 'רומן שנגמר, ותאונה מחזירה אישה נשואה ואת המאהב שלה',
    themes: ['בגידה', 'אהבה אסורה', 'העבר חוזר'],
  },
  '1014480': {
    prose: 2,
    pull: 'grip',
    worlds: ['strange', 'suspense'],
    about: 'נערה בלי קסם נשאבת למרדף אחרי חפצים מקוללים בבוסטון',
    themes: ['פנטזיה', 'אחים', 'נקמה'],
  },
  '1014520': {
    prose: 1,
    pull: 'grip',
    worlds: ['suspense'],
    about: 'עיתונאית נלכדת בפודקאסט שלה מול אישה שנראית כנועה',
    themes: ['זהות', 'סוד בבית', 'שקרים'],
  },
  '1014685': {
    prose: 2,
    pull: 'lift',
    worlds: ['love', 'loneliness'],
    about: 'אישה שהגיעה למלון לשים קץ לחייה נתקעת בחתונה של זרים',
    themes: ['חתונה', 'התחלה מחדש', 'בגידה'],
  },
  '1014959': {
    prose: 2,
    pull: 'feel',
    worlds: ['family', 'loneliness'],
    about: 'ערב יום הולדת ארבעים אישה מתעוררת שוב בגיל שש־עשרה',
    themes: ['התחלה מחדש', 'אבות ובנות', 'חרטה'],
  },
  '1015140': {
    prose: 2,
    pull: 'learn',
    worlds: ['history', 'society', 'family'],
    about: 'שתי נשים משני צדי המלחמה, קשורות במדעני הטילים שלהן',
    themes: ['מלחמה', 'נשים בעבודה', 'משטר'],
  },
  '1024113': {
    prose: 2,
    pull: 'lift',
    worlds: ['society', 'work'],
    about: 'קמצן לונדוני פוגש שלוש רוחות ורואה את מחיר האדישות',
    themes: ['עושר', 'חרטה', 'נשמה'],
  },
  '1024139': {
    prose: 3,
    pull: 'grip',
    worlds: ['suspense', 'loneliness'],
    about: 'גבר אחרי גירושים חוזר לצפות באישה מבעד לחלון המטבח',
    themes: ['פרידה', 'פשע', 'נשמה'],
  },
  '1024174': {
    prose: 1,
    pull: 'grip',
    worlds: ['suspense'],
    about: 'מורה שעוצר תלמיד חמוש מושך אליו סחטן',
    themes: ['פשע', 'איום', 'השכלה'],
  },
  '1024376': {
    prose: 2,
    pull: 'grip',
    worlds: ['work', 'ideas'],
    about: 'יזם שהאקזיט ברח ממנו נתקל בפיזיקאית שמחקרה נתקע',
    themes: ['מדע', 'עושר'],
  },
  '1024517': {
    prose: 3,
    pull: 'learn',
    worlds: ['ideas', 'society', 'faith'],
    about: 'מלחמות אחים במקרא, כעדשה לשסע הישראלי עכשיו',
    themes: ['אחים', 'שסע ישראלי', 'מקרא'],
  },
  '1024599': {
    prose: 2,
    pull: 'grip',
    worlds: ['faith', 'love', 'history'],
    about: 'אהבה אסורה מול תככי חצר, בין נסיכה, לוחם ומלך',
    themes: ['אהבה אסורה', 'חצר מלכות', 'מקרא'],
  },
  '1024772': {
    prose: 2,
    pull: 'feel',
    worlds: ['family', 'love'],
    about: 'בת שמסרבת לשכוח בזמן שאמה, חולת אלצהיימר, כבר לא זוכרת',
    themes: ['אמהות ובנות', 'זיכרון'],
  },
  '1024848': {
    prose: 1,
    pull: 'grip',
    worlds: ['family', 'suspense'],
    about: 'אלמנה מגלה שהבן שלה מנסה להשתלט על הבית ועל החשבונות',
    themes: ['בית שנלקח', 'משפחה עקומה', 'אלמנות'],
  },
  '1025072': {
    prose: 1,
    pull: 'lift',
    worlds: ['love', 'work'],
    about: 'אישה נלחמת על הדירה שלה מול עורך דין שהגיע להרוס את הבניין',
    themes: ['בית שנלקח', 'משפט'],
  },
  '1025223': {
    prose: 2,
    pull: 'grip',
    worlds: ['suspense', 'love'],
    about: 'נער חטוף בחדר חשוך, וחברתו שמוכנה להסתכן כדי למצוא אותו',
    themes: ['חטיפה', 'מרדף', 'איום'],
  },
  '1025394': {
    prose: 1,
    pull: 'lift',
    worlds: ['love', 'loneliness'],
    about: 'אופה ומסעדנית חולקים מטבח, והעבר שלה חוזר',
    themes: ['אוכל', 'העבר חוזר'],
  },
  '1025563': {
    prose: 1,
    pull: 'grip',
    worlds: ['suspense', 'family'],
    about: 'אב שלא ראה את בתו שלוש שנים מגיע לחתונה שמשהו בה מוזר',
    themes: ['אבות ובנות', 'חתונה'],
  },
  '1025855': {
    prose: 1,
    pull: 'grip',
    worlds: ['suspense', 'family'],
    about: 'מיילדת בורחת הביתה ומגלה שאביה שכר מטפלת שהיא לא סומכת עליה',
    themes: ['סוד בבית', 'אבות ובנות', 'רפואה'],
  },
  '1026026': {
    prose: 2,
    pull: 'feel',
    worlds: ['history', 'love', 'society'],
    about: 'כוכבת הוליווד חושפת שהייתה בינה, שחקנית מגטו ורשה',
    themes: ['זהות', 'מלחמה', 'שואה'],
  },
  '1026293': {
    prose: 2,
    pull: 'lift',
    worlds: ['history', 'work', 'love'],
    about: 'האלמנה קליקו בונה שמפניה, וגרושה בפריז קוראת את מכתביה',
    themes: ['אלמנות', 'נשים בעבודה'],
  },
  '1026390': {
    prose: 3,
    pull: 'learn',
    worlds: ['faith', 'family', 'history'],
    about: 'רופא מכורזים מטפל בכפרים, ואז מגיע ישוע מנצרת',
    themes: ['אמונה', 'רפואה'],
  },
  '1026480': {
    prose: 1,
    pull: 'grip',
    worlds: ['suspense', 'work'],
    about: 'עורך דין מוצא גופה ברכב שלו ונאלץ להגן על עצמו',
    themes: ['משפט', 'פשע'],
  },
  '1026524': {
    prose: 2,
    pull: 'feel',
    worlds: ['love', 'family', 'history'],
    about: 'אישה לוקחת הביתה ילד וייטנאמי שישן על המדרכה בניו יורק',
    themes: ['ילדות לבד', 'פרידה', 'הדרך הביתה'],
  },
  '1026824': {
    prose: 3,
    pull: 'learn',
    worlds: ['ideas', 'society'],
    about: 'סיפורים על המרדף אחרי עושר, ומה הוא עושה לנפש',
    themes: ['עושר', 'נשמה'],
  },
  '1027285': {
    prose: 4,
    pull: 'learn',
    worlds: ['ideas', 'love', 'strange'],
    about: 'אחרי שהים הטביע ערים, חוקר מחפש שיר שנעלם',
    themes: ['עולם שנשבר', 'ספרים'],
  },
  '1027288': {
    prose: 1,
    pull: 'grip',
    worlds: ['suspense', 'ideas'],
    about: 'לנגדון בפראג, אחרי שחוקרת התודעה נעלמת עם כתב היד שלה',
    themes: ['מרדף', 'מדע', 'ספרים'],
  },
  '1027378': {
    prose: 4,
    pull: 'feel',
    worlds: ['family', 'history', 'loneliness'],
    about: 'בת כותבת את האם שנשלחה לארגנטינה ונאלצה להמציא את עצמה מחדש',
    themes: ['אמהות ובנות', 'זהות', 'זיכרון'],
  },
  '1027391': {
    prose: 2,
    pull: 'feel',
    worlds: ['society', 'family', 'loneliness'],
    about: 'כמה ישראלים בלילה אחד מנסים להגיע הביתה, בים באוויר וביבשה',
    themes: ['הדרך הביתה', 'אמהות ובנות', 'שירה'],
  },
  '1027465': {
    prose: 1,
    pull: 'lift',
    worlds: ['love', 'family'],
    about: 'בת זקונים מנאפולי פוגשת זמר אופרה והמסלול שהוריה קבעו נשבר',
    themes: ['אמנות', 'שירה'],
  },
  '1027677': {
    prose: 3,
    pull: 'feel',
    worlds: ['loneliness', 'love'],
    about: 'אישה נשארת לבד בברוקלין עם שני כלבים, והזוגיות נמתחת בין יבשות',
    themes: ['פרידה', 'חיות מחמד'],
  },
  '1028386': {
    prose: 4,
    pull: 'feel',
    worlds: ['family', 'society'],
    about: 'בן מספר על אב, אם ומשפט, במשפחה שכל אושר בה עקום',
    themes: ['משפחה עקומה', 'משפט'],
  },
  '105581': {
    prose: 3,
    pull: 'grip',
    worlds: ['history', 'love', 'strange'],
    about: 'ילד בברצלונה אחרי מלחמת האזרחים מוצא ספר שאיש אינו אמור לקרוא',
    themes: ['ספרים', 'מלחמה'],
  },
  '1630': {
    prose: 4,
    pull: 'weird',
    worlds: ['ideas', 'society'],
    about: 'צעיר מוכר את הנפש תמורת יופי שלא מזדקן, והדיוקן מזדקן במקומו',
    themes: ['נשמה', 'אמנות'],
  },
  '16512': {
    prose: 4,
    pull: 'learn',
    worlds: ['ideas', 'society'],
    about: 'פראנקל מתעד את מחנה ההשמדה ושואל איך מוצאים משמעות',
    themes: ['שואה', 'הישרדות'],
  },
  '19663': {
    prose: 2,
    pull: 'grip',
    worlds: ['history', 'love', 'work'],
    about: 'אנגליה של המאה השתים־עשרה, סביב בניית קתדרלה',
    themes: ['אמונה', 'נקמה', 'מלחמה'],
  },
  '3409': {
    prose: 3,
    pull: 'weird',
    worlds: ['strange', 'society'],
    about: 'מגפה מוחקת כמעט את כולם, והניצולים נאלצים לבחור צד',
    themes: ['עולם שנשבר', 'הישרדות'],
  },
  '935953': {
    prose: 2,
    pull: 'weird',
    worlds: ['ideas', 'love', 'strange'],
    about: 'שלושה חניכים מזיזים גורלות: שידוך, השראה, ומי שחושב שהוא יודע הכול',
    themes: ['גורל', 'שידוך'],
  },
  '959757': {
    prose: 3,
    pull: 'learn',
    worlds: ['society', 'ideas'],
    about: 'ברפובליקת גלעד נשארת לשפחה אפשרות אחת: ללדת',
    themes: ['משטר', 'הישרדות'],
  },
  '963912': {
    prose: 3,
    pull: 'feel',
    worlds: ['loneliness', 'ideas', 'love'],
    about: 'עורך דין מגלה שהמת חי תחת זהות גנובה, ומתקרב לרצון למחוק חיים',
    themes: ['זהות', 'התחלה מחדש'],
  },
  '966685': {
    prose: 1,
    pull: 'lift',
    worlds: ['love', 'work', 'loneliness'],
    about: 'פרופסור לגנטיקה עם קושי חברתי יוצא לחפש אישה לפי רשימה',
    themes: ['שידוך', 'מדע', 'אהבה לא שגרתית'],
  },
  '969110': {
    prose: 4,
    pull: 'learn',
    worlds: ['society', 'history', 'ideas'],
    about: 'מאורעות תרפ״ט, והשאלה למה השנה הזו עיצבה את שני הצדדים',
    themes: ['שסע ישראלי', 'מלחמה'],
  },
  '981829': {
    prose: 1,
    pull: 'lift',
    worlds: ['ideas', 'faith'],
    about: 'רועה נוטש את חייו ויוצא למסע בעקבות חלום',
    themes: ['גורל', 'אמונה', 'מסע'],
  },
  '994697': {
    prose: 1,
    pull: 'grip',
    worlds: ['suspense'],
    about: 'ציירת יורה בבעלה ומשתתקת, והשתיקה הופכת לפרשה',
    themes: ['שתיקה', 'רצח', 'אמנות'],
  },
  '997264': {
    prose: 3,
    pull: 'learn',
    worlds: ['family', 'ideas', 'society'],
    about: 'ילדה בלי בית ספר, במשפחה שמתכוננת לקץ, יוצאת אל ההשכלה',
    themes: ['ילדות לבד', 'השכלה'],
  },
  '997641': {
    prose: 2,
    pull: 'feel',
    worlds: ['loneliness', 'love', 'suspense'],
    about: 'ילדת הביצות גדלה לבד, עד שגופה בביצה מפנה אליה אצבע',
    themes: ['ילדות לבד', 'פשע'],
  },
}

export function readingOf(id: string): BookReading | null {
  return readings[id] ?? null
}

export function booksSharingTheme(theme: string, exceptId?: string): string[] {
  return Object.keys(readings).filter((id) => id !== exceptId && readings[id].themes.includes(theme))
}

const themesByCount = (() => {
  const counts = new Map<string, number>()
  for (const reading of Object.values(readings)) {
    for (const theme of reading.themes) counts.set(theme, (counts.get(theme) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([theme, count]) => ({ theme, count }))
    .sort((a, b) => b.count - a.count || a.theme.localeCompare(b.theme, 'he'))
})()

const themeNames = new Set(themesByCount.map((item) => item.theme))

export function themesByPopularity(): readonly { theme: string; count: number }[] {
  return themesByCount
}

export function isKnownTheme(theme: string): boolean {
  return themeNames.has(theme)
}

export function worldsPhrase(worlds: ReadingWorld[]): string {
  const names = worlds.map((world) => worldLabel[world])
  if (names.length <= 1) return names[0] ?? ''
  if (names.length === 2) return `${names[0]} ו${names[1]}`
  return `${names.slice(0, -1).join(', ')} ו${names[names.length - 1]}`
}
