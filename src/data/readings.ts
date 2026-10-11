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
  },
  '1001156': {
    prose: 1,
    pull: 'feel',
    worlds: ['love', 'loneliness'],
    about: 'חתול יוצא עם בעליו למסע ביפן, ומתברר שזו פרידה',
  },
  '1005415': {
    prose: 2,
    pull: 'lift',
    worlds: ['work', 'love', 'society'],
    about: 'כימאית בשנות השישים מאבדת הכול ומוצאת קול בתוכנית בישול',
  },
  '1006659': {
    prose: 3,
    pull: 'weird',
    worlds: ['strange', 'family', 'society'],
    about: 'עולם שנשבר שוב ושוב, ואנשים עם כוח שההמון רוצה להשמיד',
  },
  '1008917': {
    prose: 2,
    pull: 'grip',
    worlds: ['history', 'faith', 'family'],
    about: 'הדסה נתלשת מחייה כשהמלך בפרס מחפש מלכה חדשה',
  },
  '1012772': {
    prose: 1,
    pull: 'grip',
    worlds: ['suspense', 'family'],
    about: 'רוצח סדרתי מעביר את השבויה שלו לבית החדש, עם בתו',
  },
  '1012903': {
    prose: 2,
    pull: 'weird',
    worlds: ['strange', 'ideas'],
    about: 'ילדים רודפים אחרי מדליון, בין טרולים לבינה שמנהלת אי',
  },
  '1013486': {
    prose: 3,
    pull: 'feel',
    worlds: ['love', 'society', 'loneliness'],
    about: 'אהבה בין שני גברים בפולין הקומוניסטית, מסופרת מניו יורק',
  },
  '1013507': {
    prose: 1,
    pull: 'grip',
    worlds: ['suspense', 'work'],
    about: 'עוזרת בית נכנסת לבית נוצץ ומגלה סודות מסוכנים משלה',
  },
  '1013868': {
    prose: 1,
    pull: 'grip',
    worlds: ['suspense'],
    about: 'שתי זרות בבר מחליטות לרצוח זו לזו את מי שהרס להן את החיים',
  },
  '1014061': {
    prose: 4,
    pull: 'feel',
    worlds: ['family', 'love'],
    about: 'אחות ליד מיטת אחיה הגוסס, מואשמת שאהבתה הביאה את האסון',
  },
  '1014471': {
    prose: 2,
    pull: 'grip',
    worlds: ['love', 'work'],
    about: 'רומן שנגמר, ותאונה מחזירה אישה נשואה ואת המאהב שלה',
  },
  '1014480': {
    prose: 2,
    pull: 'grip',
    worlds: ['strange', 'suspense'],
    about: 'נערה בלי קסם נשאבת למרדף אחרי חפצים מקוללים בבוסטון',
  },
  '1014520': {
    prose: 1,
    pull: 'grip',
    worlds: ['suspense'],
    about: 'עיתונאית נלכדת בפודקאסט שלה מול אישה שנראית כנועה',
  },
  '1014685': {
    prose: 2,
    pull: 'lift',
    worlds: ['love', 'loneliness'],
    about: 'אישה שהגיעה למלון לשים קץ לחייה נתקעת בחתונה של זרים',
  },
  '1014959': {
    prose: 2,
    pull: 'feel',
    worlds: ['family', 'loneliness'],
    about: 'ערב יום הולדת ארבעים אישה מתעוררת שוב בגיל שש־עשרה',
  },
  '1015140': {
    prose: 2,
    pull: 'learn',
    worlds: ['history', 'society', 'family'],
    about: 'שתי נשים משני צדי המלחמה, קשורות במדעני הטילים שלהן',
  },
  '1024113': {
    prose: 2,
    pull: 'lift',
    worlds: ['society', 'work'],
    about: 'קמצן לונדוני פוגש שלוש רוחות ורואה את מחיר האדישות',
  },
  '1024139': {
    prose: 3,
    pull: 'grip',
    worlds: ['suspense', 'loneliness'],
    about: 'גבר אחרי גירושים חוזר לצפות באישה מבעד לחלון המטבח',
  },
  '1024174': {
    prose: 1,
    pull: 'grip',
    worlds: ['suspense'],
    about: 'מורה שעוצר תלמיד חמוש מושך אליו סחטן',
  },
  '1024376': {
    prose: 2,
    pull: 'grip',
    worlds: ['work', 'ideas'],
    about: 'יזם שהאקזיט ברח ממנו נתקל בפיזיקאית שמחקרה נתקע',
  },
  '1024517': {
    prose: 3,
    pull: 'learn',
    worlds: ['ideas', 'society', 'faith'],
    about: 'מלחמות אחים במקרא, כעדשה לשסע הישראלי עכשיו',
  },
  '1024599': {
    prose: 2,
    pull: 'grip',
    worlds: ['faith', 'love', 'history'],
    about: 'אהבה אסורה מול תככי חצר, בין נסיכה, לוחם ומלך',
  },
  '1024772': {
    prose: 2,
    pull: 'feel',
    worlds: ['family', 'love'],
    about: 'בת שמסרבת לשכוח בזמן שאמה, חולת אלצהיימר, כבר לא זוכרת',
  },
  '1024848': {
    prose: 1,
    pull: 'grip',
    worlds: ['family', 'suspense'],
    about: 'אלמנה מגלה שהבן שלה מנסה להשתלט על הבית ועל החשבונות',
  },
  '1025072': {
    prose: 1,
    pull: 'lift',
    worlds: ['love', 'work'],
    about: 'אישה נלחמת על הדירה שלה מול עורך דין שהגיע להרוס את הבניין',
  },
  '1025223': {
    prose: 2,
    pull: 'grip',
    worlds: ['suspense', 'love'],
    about: 'נער חטוף בחדר חשוך, וחברתו שמוכנה להסתכן כדי למצוא אותו',
  },
  '1025394': {
    prose: 1,
    pull: 'lift',
    worlds: ['love', 'loneliness'],
    about: 'אופה ומסעדנית חולקים מטבח, והעבר שלה חוזר',
  },
  '1025563': {
    prose: 1,
    pull: 'grip',
    worlds: ['suspense', 'family'],
    about: 'אב שלא ראה את בתו שלוש שנים מגיע לחתונה שמשהו בה מוזר',
  },
  '1025855': {
    prose: 1,
    pull: 'grip',
    worlds: ['suspense', 'family'],
    about: 'מיילדת בורחת הביתה ומגלה שאביה שכר מטפלת שהיא לא סומכת עליה',
  },
  '1026026': {
    prose: 2,
    pull: 'feel',
    worlds: ['history', 'love', 'society'],
    about: 'כוכבת הוליווד חושפת שהייתה בינה, שחקנית מגטו ורשה',
  },
  '1026293': {
    prose: 2,
    pull: 'lift',
    worlds: ['history', 'work', 'love'],
    about: 'האלמנה קליקו בונה שמפניה, וגרושה בפריז קוראת את מכתביה',
  },
  '1026390': {
    prose: 3,
    pull: 'learn',
    worlds: ['faith', 'family', 'history'],
    about: 'רופא מכורזים מטפל בכפרים, ואז מגיע ישוע מנצרת',
  },
  '1026480': {
    prose: 1,
    pull: 'grip',
    worlds: ['suspense', 'work'],
    about: 'עורך דין מוצא גופה ברכב שלו ונאלץ להגן על עצמו',
  },
  '1026524': {
    prose: 2,
    pull: 'feel',
    worlds: ['love', 'family', 'history'],
    about: 'אישה לוקחת הביתה ילד וייטנאמי שישן על המדרכה בניו יורק',
  },
  '1026824': {
    prose: 3,
    pull: 'learn',
    worlds: ['ideas', 'society'],
    about: 'סיפורים על המרדף אחרי עושר, ומה הוא עושה לנפש',
  },
  '1027285': {
    prose: 4,
    pull: 'learn',
    worlds: ['ideas', 'love', 'strange'],
    about: 'אחרי שהים הטביע ערים, חוקר מחפש שיר שנעלם',
  },
  '1027288': {
    prose: 1,
    pull: 'grip',
    worlds: ['suspense', 'ideas'],
    about: 'לנגדון בפראג, אחרי שחוקרת התודעה נעלמת עם כתב היד שלה',
  },
  '1027378': {
    prose: 4,
    pull: 'feel',
    worlds: ['family', 'history', 'loneliness'],
    about: 'בת כותבת את האם שנשלחה לארגנטינה ונאלצה להמציא את עצמה מחדש',
  },
  '1027391': {
    prose: 2,
    pull: 'feel',
    worlds: ['society', 'family', 'loneliness'],
    about: 'כמה ישראלים בלילה אחד מנסים להגיע הביתה, בים באוויר וביבשה',
  },
  '1027465': {
    prose: 1,
    pull: 'lift',
    worlds: ['love', 'family'],
    about: 'בת זקונים מנאפולי פוגשת זמר אופרה והמסלול שהוריה קבעו נשבר',
  },
  '1027677': {
    prose: 3,
    pull: 'feel',
    worlds: ['loneliness', 'love'],
    about: 'אישה נשארת לבד בברוקלין עם שני כלבים, והזוגיות נמתחת בין יבשות',
  },
  '1028386': {
    prose: 4,
    pull: 'feel',
    worlds: ['family', 'society'],
    about: 'בן מספר על אב, אם ומשפט, במשפחה שכל אושר בה עקום',
  },
  '105581': {
    prose: 3,
    pull: 'grip',
    worlds: ['history', 'love', 'strange'],
    about: 'ילד בברצלונה אחרי מלחמת האזרחים מוצא ספר שאיש אינו אמור לקרוא',
  },
  '1630': {
    prose: 4,
    pull: 'weird',
    worlds: ['ideas', 'society'],
    about: 'צעיר מוכר את הנפש תמורת יופי שלא מזדקן, והדיוקן מזדקן במקומו',
  },
  '16512': {
    prose: 4,
    pull: 'learn',
    worlds: ['ideas', 'society'],
    about: 'פראנקל מתעד את מחנה ההשמדה ושואל איך מוצאים משמעות',
  },
  '19663': {
    prose: 2,
    pull: 'grip',
    worlds: ['history', 'love', 'work'],
    about: 'אנגליה של המאה השתים־עשרה, סביב בניית קתדרלה',
  },
  '3409': {
    prose: 3,
    pull: 'weird',
    worlds: ['strange', 'society'],
    about: 'מגפה מוחקת כמעט את כולם, והניצולים נאלצים לבחור צד',
  },
  '935953': {
    prose: 2,
    pull: 'weird',
    worlds: ['ideas', 'love', 'strange'],
    about: 'שלושה חניכים מזיזים גורלות: שידוך, השראה, ומי שחושב שהוא יודע הכול',
  },
  '959757': {
    prose: 3,
    pull: 'learn',
    worlds: ['society', 'ideas'],
    about: 'ברפובליקת גלעד נשארת לשפחה אפשרות אחת: ללדת',
  },
  '963912': {
    prose: 3,
    pull: 'feel',
    worlds: ['loneliness', 'ideas', 'love'],
    about: 'עורך דין מגלה שהמת חי תחת זהות גנובה, ומתקרב לרצון למחוק חיים',
  },
  '966685': {
    prose: 1,
    pull: 'lift',
    worlds: ['love', 'work', 'loneliness'],
    about: 'פרופסור לגנטיקה עם קושי חברתי יוצא לחפש אישה לפי רשימה',
  },
  '969110': {
    prose: 4,
    pull: 'learn',
    worlds: ['society', 'history', 'ideas'],
    about: 'מאורעות תרפ״ט, והשאלה למה השנה הזו עיצבה את שני הצדדים',
  },
  '981829': {
    prose: 1,
    pull: 'lift',
    worlds: ['ideas', 'faith'],
    about: 'רועה נוטש את חייו ויוצא למסע בעקבות חלום',
  },
  '994697': {
    prose: 1,
    pull: 'grip',
    worlds: ['suspense'],
    about: 'ציירת יורה בבעלה ומשתתקת, והשתיקה הופכת לפרשה',
  },
  '997264': {
    prose: 3,
    pull: 'learn',
    worlds: ['family', 'ideas', 'society'],
    about: 'ילדה בלי בית ספר, במשפחה שמתכוננת לקץ, יוצאת אל ההשכלה',
  },
  '997641': {
    prose: 2,
    pull: 'feel',
    worlds: ['loneliness', 'love', 'suspense'],
    about: 'ילדת הביצות גדלה לבד, עד שגופה בביצה מפנה אליה אצבע',
  },
}

export function readingOf(id: string): BookReading | null {
  return readings[id] ?? null
}

export function worldsPhrase(worlds: ReadingWorld[]): string {
  const names = worlds.map((world) => worldLabel[world])
  if (names.length <= 1) return names[0] ?? ''
  if (names.length === 2) return `${names[0]} ו${names[1]}`
  return `${names.slice(0, -1).join(', ')} ו${names[names.length - 1]}`
}
