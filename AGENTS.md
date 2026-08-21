# AGENTS.md

Guidance for AI agents working in this repo. Project language is **pt-BR** — keep user-facing strings, comments, and docs in Portuguese.

## Structure

Three independent npm packages (no workspaces):

- `backend/` — Express + Socket.IO API, SQLite via `sql.js` (`backend/chamados.db`, gitignored). Entry: `src/server.js`.
- `frontend/` — React 18 + Vite PWA (also Tauri desktop via `src-tauri/`). Entry: `src/main.jsx`.
- `evolution-api/` — vendored Evolution API v1.8.2 (WhatsApp gateway), **gitignored**. If missing: `git clone --branch 1.8.2 --depth 1 https://github.com/EvolutionAPI/evolution-api.git evolution-api` then `npm install --legacy-peer-deps`.

## Commands

Run from the repo root:

- `npm run install:all` — installs deps for all packages (evolution-api needs `--legacy-peer-deps`).
- `npm run dev` — backend + frontend + evolution-api.
- `npm run dev:app` — backend + frontend only (no WhatsApp).
- `npm run dev:back` — backend + evolution-api only.
- `npm run dev:front` / `npm run backend` / `npm run evolution` — single process each.
- `npm run build` — frontend production build only.

Ports: backend `3001`, frontend `5173` (Vite, `strictPort: true`, binds `0.0.0.0` for LAN/mobile access), evolution-api `8081`. Vite proxies `/api` → `localhost:3001`; for a remote API set `VITE_API_URL` and `VITE_SOCKET_URL`.

## Versioning

Versions live in three places that must stay in sync: root `VERSION`, `backend/package.json`, `frontend/package.json`. Bump all at once with `node bump-version.js` (patch increment only); `frontend/src/pages/Configuracoes.jsx` imports its displayed version from `frontend/package.json`, so no manual edit needed.

## Deploy

Frontend deploys as a static PWA to Netlify via `netlify.toml` (base `frontend/`, publish `dist/`, SPA redirect to `/index.html`, Node 20). The backend cannot run on Netlify — the SQLite file wouldn't persist; it runs on a local/LAN server.

## Verification

No tests or linters are configured. To verify changes, run the relevant processes (`npm run dev` or `dev:app`) and exercise the feature manually; check the backend health endpoint at `GET /api/health`.
