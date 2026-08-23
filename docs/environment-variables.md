# Environment variables

## Frontend (Vite)

Create a `.env.local` in the repo root (not committed) with:

- **`VITE_API_BASE_URL`**: base URL of the backend API
  - Example (local): `http://localhost:3001`

## Backend (Express)

Create `backend/.env` (not committed) based on `backend/.env.example`.

- **`PORT`**: server port (default `3001`)
- **`GEMINI_API_KEY`**: required for LLM summarization
- **`ELEVENLABS_API_KEY`**: required for audio generation

