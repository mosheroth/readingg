# ספרים לילדים ולנוער

מדף פשוט מעל [Libby](https://libbyapp.com/) לספרייה העירונית הוד השרון. הספרייה יושבת על הקונסורציום Israel Digital. האתר מציג ספרים וספרי שמע בעברית לילדים ולנוער, לפי קטגוריות, ומתוך כל כרטיס אפשר לפתוח את הספר לקריאה בליבי.

הקריאה המלאה נשארת אצל Libby. האתר לא שומר מספר קורא ולא מוריד את קובץ הספר. בליבי בוחרים את Hod Hasharon Public Library ומזינים את מספר הקורא.

«הספר הבא», האתר הקודם, יושב ב־`archive/hasefer-haba` ולא ממשיך להתפרסם.

## אתר סטטי

GitHub Actions (`.github/workflows/pages.yml`) בונה עם `BASE_PATH=/readingg/` ודוחף את האתר הבנוי לענף `gh-pages`. הכתובת:

https://mosheroth.github.io/readingg/

## הרצה

```bash
npm install
npm test
npm run dev
```
