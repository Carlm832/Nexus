# Nexus

Nexus is a **research discovery + summarization** app.

- **Frontend**: Vite + React (runs on `http://localhost:5173`)
- **Backend**: Node + Express API (runs on `http://localhost:3001`)

## Prerequisites

- **Node.js**: recommended **18+**
- **npm**: comes with Node (this repo uses npm commands below)

## Quickstart (Frontend)

From the repo root:

```bash
npm install
npm run dev
```

Build and preview:

```bash
npm run build
npm run preview
```

## Quickstart (Backend API)

In a second terminal:

```bash
cd backend
npm install
npm run dev
```

The backend serves:

- `GET /api/papers` — list ingested papers
- `POST /api/submit` — submit a DOI for ingestion
- `GET /api/audio/<file>.mp3` — generated audio files

The ingestion pipeline currently targets these disciplines:

- `Neuroscience`
- `Psychology`
- `Economics`
- `Biology`
- `Artificial Intelligence`
- `Climate Science`

## Frontend ↔ Backend connection

Today the frontend calls the backend at `http://localhost:3001`.

In the next steps of this repo’s setup we standardize this with an env var:

- **`VITE_API_BASE_URL`** (example: `http://localhost:3001`)

See [`docs/environment-variables.md`](docs/environment-variables.md).

## Environment variables and secrets

- Backend reads secrets from `backend/.env` (local-only; **do not commit**).
- Use [`backend/.env.example`](backend/.env.example) as a starting point.
- Run `npm run check:apis` inside `backend` to verify Gemini and ElevenLabs configuration.
- ElevenLabs free-tier API access requires a generated/default voice you own; premade/library voices can return payment or authorization errors.

## Common tasks

- **Lint**:

```bash
npm run lint
```

## Troubleshooting

- **Frontend loads but no live data**: if the backend isn’t running, the UI falls back to mock data.
- **CORS errors**: ensure the backend is running on `3001` and the frontend on `5173`.

## React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
