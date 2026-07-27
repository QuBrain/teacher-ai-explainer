# Teacher AI Explainer — Agent Guide

## Project structure

Two independent sub-projects, **not** a monorepo:

| Layer | Location | Entrypoint | Tech |
|-------|----------|------------|------|
| Backend | `/` (root) | `main.py` | FastAPI + WebSocket + Gemini 2.5 Pro (Vertex AI) |
| Frontend | `whiteboard-dashboard/` | `src/main.jsx` | React 19 + Vite + ReactFlow + d3-force |

## Commands

### Frontend (`whiteboard-dashboard/`)
```sh
npm run dev      # Vite dev server (localhost:5173)
npm run build    # Vite build → dist/
npm run lint     # ESLint v9 (flat config)
npm run preview  # Vite preview
```

### Backend (root)
```sh
uvicorn main:app --reload          # dev server
docker build -t teacher-ai . && docker run -p 8080:8080 teacher-ai   # Docker
pytest tests/ -v                   # run backend tests
ruff check .                       # lint backend
```

### CI/CD
GitHub Actions workflows in `.github/workflows/`:
- `ci.yml` — runs on push/PR to main: lint (ruff + eslint), test (pytest), build (vite)
- `audit.yml` — weekly security audit (pip-audit, npm audit, bandit, truffleHog)

## Critical gotchas

- **WebSocket URL is hardcoded** in `App.jsx:93` to a Cloud Run deployment. No env var or local fallback. For local dev, change this to `ws://localhost:8000/ws/reason`.
- **`requirements.txt` is bloated** (298 packages, many unused like torch, transformers, langchain, etc.).
- **No `.env` files.** Backend requires `GOOGLE_CLOUD_PROJECT` and `GOOGLE_CLOUD_LOCATION` (default: `us-central1`).
- **Tailwind v4** is in devDeps but has no config and is not imported in CSS — likely unused.
- **`.gitignore`** has Next.js entries (`/.next/`, `/out/`) — stale from template.
- **No formatter config** (black is in requirements.txt but unconfigured).
- **Root `package.json` is stale** — only exists for hoisted deps. Real frontend is in `whiteboard-dashboard/`.

## Architecture

- Backend: Single WebSocket endpoint `/ws/reason`. Reads `System_Prompt.md` for Gemini system instructions. Fresh chat session per query. Gemini calls `add_reasoning_node` tool; backend forwards node data over WebSocket with 1.2s delay between nodes.
- Frontend: `FlowBoard` component manages ReactFlow graph + d3-force layout + WebSocket client + conversation history sidebar. Custom node type `mathNode` renders KaTeX via `react-markdown` + `remark-math` + `rehype-katex`.
- Node types: `Given`, `Objective`, `Principle`, `Derivation`, `Self-Correction`, `Alternative`, `Final Answer`.
- Probe feature: clicking `?` on a node sends `{"type":"probe","parent_id":"...","content":"..."}` to get an alternative explanation.

## Deployment

- Backend: Docker → Google Cloud Run (port from `$PORT`, default 8080).
- Frontend: `npm run build` → Firebase hosting (`.firebaserc` configured).
- CORS in `main.py` allows `localhost:5173` and two Firebase domains.
