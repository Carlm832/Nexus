# Contributing

## Development setup

See [`README.md`](README.md) for the frontend + backend quickstart.

## Pull request checklist (UI/UX)

- Keyboard navigation works (tab order, focus visible, escape closes modals)
- Empty/loading/error states are reasonable
- No console errors in the browser devtools
- Basic a11y sanity check (headings/labels make sense; no obvious contrast/focus issues)

## Quality checks

From repo root:

```bash
npm run lint
```

## Secrets policy

- Never commit `.env` files.
- Use `.env.example` files as templates.
- If a secret is ever committed, rotate it immediately.

