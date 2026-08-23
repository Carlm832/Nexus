# Local development

## Ports

- **Frontend**: Vite dev server — `http://localhost:5173`
- **Backend**: Express API — `http://localhost:3001`

## Running both apps

In terminal A (repo root):

```bash
npm install
npm run dev
```

In terminal B:

```bash
cd backend
npm install
npm run dev
```

## Troubleshooting

- **Backend unreachable**: the frontend currently falls back to mock data when it can’t reach the API.
- **Port already in use**: stop the process using the port, or set `PORT` in `backend/.env`.

