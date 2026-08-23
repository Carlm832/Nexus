<div align="center">
  <img src="public/nexus-logo.svg" alt="Nexus" height="60" />
  <br /><br />
  <p><strong>Research Intelligence Platform</strong></p>
  <p>Surfaces peer-reviewed science across six disciplines — synthesised, searchable, and ready to read.</p>

  ![License](https://img.shields.io/badge/license-MIT-blue)
  ![Node](https://img.shields.io/badge/node-18%2B-brightgreen)
  ![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
  ![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)
</div>

---

## What is Nexus?

Nexus aggregates peer-reviewed research papers from [OpenAlex](https://openalex.org) (250M+ scientific records) and uses the Gemini AI API to produce plain-English summaries, significance notes, and evidence-level ratings. Papers are narrated on demand via ElevenLabs text-to-speech.

**Disciplines covered:** Neuroscience · Artificial Intelligence · Climate Science · Economics · Biology · Psychology

**Key rules enforced automatically:**
- No forthcoming or future-dated papers
- No preprints or pre-review work
- Only papers with a full abstract are ingested

---

## Features

| Feature | Detail |
|---|---|
| 🔍 **Live search** | Filters title, abstract, and authors in real time |
| 🗂 **Discipline filters** | One-click chips for all six disciplines |
| 📊 **Sort options** | Newest · Most cited · Evidence level |
| 🔖 **Bookmarks** | Save papers locally; dedicated saved list view |
| 🔊 **Audio narration** | On-demand MP3 generation per paper |
| 📋 **Citation export** | APA, MLA, Chicago, BibTeX, RIS |
| 🔗 **Deep links** | Shareable `?paper=<id>` URLs |
| ⌨️ **Keyboard shortcuts** | `/` focuses search · `Esc` closes modals |
| 🌙 **Dark mode** | Persisted via localStorage |

---

## Architecture

```
Nexus/
├── src/                    # React frontend (Vite)
│   ├── App.jsx             # Main shell — routing, state, search/sort
│   ├── components/
│   │   ├── ResearchCard    # Feed card with discipline badge
│   │   ├── ArticleView     # Full article + audio player + citation modal
│   │   ├── AuthModal       # Sign-in / sign-up dialog
│   │   ├── CurationModal   # Discipline preference selector
│   │   └── SubmitModal     # Submit a paper by DOI
│   └── data/mockData.js    # Offline fallback (mirrors database.json)
│
├── backend/
│   ├── src/
│   │   ├── index.js        # Express API server (port 3001)
│   │   ├── scripts/
│   │   │   └── ingest.js   # Bulk ingestion pipeline
│   │   └── services/
│   │       ├── openalex.js # OpenAlex API client
│   │       ├── crossref.js # Crossref API client + normalizer
│   │       ├── llm.js      # Gemini AI synthesis
│   │       └── tts.js      # ElevenLabs text-to-speech
│   └── data/
│       └── database.json   # Ingested paper store
│
└── public/
    ├── nexus-icon.svg      # Favicon
    └── nexus-logo.svg      # Full wordmark (navbar)
```

---

## Getting Started

### Prerequisites

- **Node.js 18+**
- API keys for **Google Gemini** and **ElevenLabs** (optional — the app runs without them in offline mode)

### 1 · Install dependencies

```bash
# Frontend
npm install

# Backend
cd backend && npm install && cd ..
```

### 2 · Configure environment variables

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
GEMINI_API_KEY=your_gemini_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_VOICE_ID=your_voice_id   # optional — defaults to a preset
```

### 3 · Run

**Frontend only** (uses the 17-paper offline cache):
```bash
npm run dev
```

**Frontend + Backend** (live API, all features):
```bash
# Terminal 1
npm run dev

# Terminal 2
npm run server
```

Open **http://localhost:5173**

---

## API Reference

The backend runs on `http://localhost:3001`. The Vite dev server proxies all `/api` calls automatically.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/papers` | List all published, peer-reviewed papers |
| `GET` | `/api/papers?discipline=Neuroscience` | Filter by discipline |
| `GET` | `/api/papers?search=alzheimer` | Full-text search |
| `POST` | `/api/submit` | Submit a DOI for ingestion `{ doi }` |
| `POST` | `/api/papers/:id/audio` | Generate audio narration for a paper |
| `GET` | `/api/audio/:file.mp3` | Stream a generated audio file |

---

## Ingestion Pipeline

To expand the database with fresh papers from OpenAlex:

```bash
npm run ingest
# or with a custom limit per discipline:
node backend/src/scripts/ingest.js 10
```

The pipeline:
1. Queries OpenAlex for each discipline (filtered: published, English, has abstract, not a preprint)
2. Reconstructs full-text abstracts from OpenAlex's inverted index format
3. Sends each paper to Gemini for synthesis (summary, significance, limitations, evidence level, tags)
4. Falls back to structured rule-based synthesis if Gemini quota is unavailable
5. Deduplicates against existing entries before writing to `database.json`

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite frontend dev server |
| `npm run server` | Start Express backend API |
| `npm run ingest` | Run the OpenAlex ingestion pipeline |
| `npm run build` | Production build to `dist/` |
| `npm run test` | Run Vitest unit tests |
| `npm run lint` | ESLint check |

---

## Verification

```bash
# Check all API connections (Gemini + ElevenLabs)
cd backend && node src/scripts/checkApis.js

# Run unit tests
npm run test
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | For synthesis | Google Gemini API key |
| `ELEVENLABS_API_KEY` | For audio | ElevenLabs API key |
| `ELEVENLABS_VOICE_ID` | Optional | Custom voice ID (defaults to preset) |
| `VITE_API_BASE_URL` | Optional | Override API base URL (defaults to Vite proxy) |
| `PORT` | Optional | Backend port (default: `3001`) |

---

## License

MIT
