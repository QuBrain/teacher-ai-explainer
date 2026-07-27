# Teacher AI Explainer — Agent Guide

## Project structure

Two independent sub-projects, **not** a monorepo:

| Layer | Location | Entrypoint | Tech |
|-------|----------|------------|------|
| Backend | `/` (root) | `main.py` (legacy), `teacher_ai.py` (new) | FastAPI + WebSocket + LiteLLM |
| Backend package | `teacher_ai/` | `standalone.py` | LiteLLM, FastAPI |
| Frontend | `whiteboard-dashboard/` | `src/main.tsx` | React 19 + Vite + ReactFlow + d3-force |

## Commands

### Frontend (`whiteboard-dashboard/`)
```sh
npm run dev      # Vite dev server (localhost:5173)
npm run build    # Vite build → dist/
npm run lint     # ESLint v9 (flat config)
npm run typecheck # tsc --noEmit
npm run preview  # Vite preview
```

### Backend (root)
```sh
python teacher_ai.py                  # standalone mode (default, LiteLLM + WebSocket)
python teacher_ai.py --mode mcp       # MCP mode (not yet implemented)
uvicorn main:app --reload             # legacy dev server (Vertex AI)
pytest tests/ -v                      # run backend tests
ruff check .                          # lint backend
```

### CI/CD
GitHub Actions workflows in `.github/workflows/`:
- `ci.yml` — runs on push/PR to main: lint (ruff + eslint), type check (tsc), test (pytest + vitest), build (vite)
- `audit.yml` — weekly security audit (pip-audit, npm audit, bandit, truffleHog)

Run CI locally with `act` before pushing:
```sh
act -j backend --pull=false   # Python lint + test
act -j frontend --pull=false  # frontend lint + typecheck + test + build
```

## Critical gotchas

- **WebSocket URL is hardcoded** in `App.tsx:96` to a Cloud Run deployment. For local dev, change to `ws://localhost:8000/ws/reason`.
- **No `.env` files.** Backend requires `GOOGLE_CLOUD_PROJECT` + `GOOGLE_CLOUD_LOCATION` for legacy `main.py`, or `LLM_PROVIDER` + `LLM_API_KEY` for `teacher_ai.py`.
- **Tailwind v4** is in devDeps but has no config and is not imported in CSS — likely unused.
- **`.gitignore`** has Next.js entries (`/.next/`, `/out/`) — stale from template.
- **Root `package.json` is stale** — only exists for hoisted deps. Real frontend is in `whiteboard-dashboard/`.

## Architecture

- **Dual-mode entrypoint:** `teacher_ai.py --mode standalone|mcp` (default: standalone).
- **Standalone mode** (`teacher_ai/standalone.py`): FastAPI + WebSocket + LiteLLM. Calls any LLM provider via `LLM_PROVIDER` env var (e.g. `gemini/gemini-2.5-pro`, `openai/gpt-4o`, `anthropic/claude-sonnet-4-20250514`, `ollama/llama3.1`). LiteLLM telemetry disabled by default.
- **Legacy mode** (`main.py`): FastAPI + Vertex AI Gemini. Requires GCP project/location env vars.
- Frontend: `FlowBoard` component manages ReactFlow graph + d3-force layout + WebSocket client + conversation history sidebar. Custom node type `mathNode` renders KaTeX via `react-markdown` + `remark-math` + `rehype-katex`.
- Node types: `Given`, `Objective`, `Principle`, `Derivation`, `Self-Correction`, `Alternative`, `Final Answer`.
- Probe feature: clicking `?` on a node sends `{"type":"probe","parent_id":"...","content":"..."}` to get an alternative explanation.
