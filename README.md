# CipherBank

> Cryptography & Blockchain MCQ practice for BCA exam preparation.

A production-quality, mobile-first single-page quiz app with 150 questions and 4 study modes.

## Features

| Mode | Description |
|---|---|
| **Read — All Questions** | Scroll through all 150 questions, tap to reveal answers |
| **Read — One by One** | Navigate question by question with prev/next |
| **Test — 150 Questions** | Locked answers, immediate feedback, score at the end |
| **Exam — 25 Random** | Randomized exam with editable answers and full review |

- Dark/light theme (persisted in localStorage)
- Wrong answer history on the home screen
- Animated score ring on results
- Mobile-first responsive design
- Works offline after first load
- Keyboard navigation (arrow keys)
- Fullscreen mode
- Accessible (semantic HTML, ARIA labels, focus states)

## Running Locally

Serve from a static HTTP server (required for `fetch()` to work):

```bash
# Using Node.js serve
npx serve .

# Using Python
python -m http.server 8080

# Using VS Code Live Server extension
# Right-click index.html → Open with Live Server
```

Then open `http://localhost:3000` (or whichever port).

## File Structure

```
/
├── index.html               # App shell
├── styles.css               # Full design system + components
├── app.js                   # Application logic (vanilla JS)
├── data/
│   └── QB-DataScience_withAnswers.json   # 150-question dataset
├── assets/
│   └── github.svg
└── README.md
```

## Data Format

The app reads `data/QB-DataScience_withAnswers.json` and validates it on startup:
- Exactly 150 questions
- Each question has options A, B, C, D
- Each question has a valid `correct_option`
- All `srno` values are unique

## Theme

Default: **Dark** (charcoal `#101214`, amber `#D6A84F` accent, muted cyan `#4FB3B3` secondary)

Toggle the theme using the sun/moon icon in the header.

## Credits

Built for BCA exam preparation.
GitHub: [saurabh7429](https://github.com/saurabh7429)
