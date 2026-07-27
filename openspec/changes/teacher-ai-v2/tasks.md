## 1. Strip Cloud Infrastructure

- [ ] 1.1 Remove `Dockerfile`, `.gcloudignore`, `firebase.json`, `.firebaserc`
- [ ] 1.2 Strip `requirements.txt` — remove Vertex AI, GCP, and unused ML packages (keep FastAPI, uvicorn, websockets, mcp, pyperclip)
- [ ] 1.3 Remove `main.py` (will be replaced by `teacher_ai_mcp.py`)

## 2. TypeScript Migration

- [ ] 2.1 Add `tsconfig.json` to `whiteboard-dashboard/`
- [ ] 2.2 Add missing runtime deps to `package.json`: `react-markdown`, `remark-math`, `rehype-katex`
- [ ] 2.3 Add dev deps: `typescript`, `@types/d3-force`
- [ ] 2.4 Create `src/types.ts` with `NodeType`, `NodeData`, `ProbeMessage`, `ReasoningNode` interfaces
- [ ] 2.5 Rename `main.jsx` → `main.tsx`, add type annotations
- [ ] 2.6 Rename `MathNode.jsx` → `MathNode.tsx`, type props with `@xyflow/react` node types
- [ ] 2.7 Rename `App.jsx` → `App.tsx`, type WebSocket handler, d3-force simulation, and state
- [ ] 2.8 Update `vite.config.js` if needed for TS support
- [ ] 2.9 Verify `npm run build` succeeds

## 3. MCP Server

- [ ] 3.1 Create `teacher_ai_mcp.py` with MCP server setup (stdio + SSE transport)
- [ ] 3.2 Implement `add_reasoning_node` tool handler
- [ ] 3.3 Implement `probe_node` tool handler with clipboard support
- [ ] 3.4 Implement `list_sessions` tool handler
- [ ] 3.5 Implement `load_session` tool handler
- [ ] 3.6 Implement `delete_session` tool handler
- [ ] 3.7 Implement `rename_session` tool handler
- [ ] 3.8 Embed system prompt in tool descriptions

## 4. WebSocket Bridge

- [ ] 4.1 Add WebSocket server to `teacher_ai_mcp.py` using `websockets` library
- [ ] 4.2 Implement broadcast on `add_reasoning_node` call
- [ ] 4.3 Implement full graph state send on client connect
- [ ] 4.4 Implement session switch broadcast on `load_session` call
- [ ] 4.5 Update frontend WebSocket URL to point to local server

## 5. Session Persistence

- [ ] 5.1 Create SQLite schema (sessions, nodes, edges tables)
- [ ] 5.2 Implement `SessionManager` class with CRUD operations
- [ ] 5.3 Wire auto-save into `add_reasoning_node` handler
- [ ] 5.4 Implement last-session auto-restore on startup
- [ ] 5.5 Create settings store (`~/.teacher-ai-explainer/settings.json`)

## 6. Frontend Updates

- [ ] 6.1 Replace probe WebSocket send with clipboard copy
- [ ] 6.2 Add session sidebar component (`SessionSidebar.tsx`)
- [ ] 6.3 Add settings panel component (`SettingsPanel.tsx`)
- [ ] 6.4 Update `App.tsx` to handle full graph state on connect
- [ ] 6.5 Update `App.tsx` to handle session switch events

## 7. Local Setup & Launch

- [ ] 7.1 Add frontend build check + auto-build on startup
- [ ] 7.2 Add static file serving for built frontend
- [ ] 7.3 Add browser auto-launch on startup
- [ ] 7.4 Create `.env.example` with available config options
- [ ] 7.5 Add port fallback logic for WebSocket server
- [ ] 7.6 Test full flow: download → run → connect LLM client → ask question → see graph

## 8. CI/CD Pipeline

- [ ] 8.1 Create `.github/workflows/ci.yml` with matrix (Python 3.11, 3.12)
- [ ] 8.2 Write functional test suite (pytest): MCP tools, SQLite, WebSocket
- [ ] 8.3 Write integration test suite: MCP → WS → browser handshake
- [ ] 8.4 Write adversarial test suite: flood, injection, XSS, RCE paths
- [ ] 8.5 Write edge case test suite: large graphs, concurrent, corrupt DB
- [ ] 8.6 Add frontend tests (vitest): component render, probe clipboard
- [ ] 8.7 Add lint configs: ruff (Python), eslint (frontend)
- [ ] 8.8 Add type check configs: mypy (Python), tsc (frontend)
- [ ] 8.9 Add coverage reporting (pytest-cov, vitest --coverage)
- [ ] 8.10 Add rate limiter to WebSocket server (token-bucket, 30/sec)
- [ ] 8.11 Add input sanitization (content length limits, strip HTML)
- [ ] 8.12 Add subprocess path validation for npm build

## 9. Security Audit Pipeline

- [ ] 9.1 Create `.github/workflows/audit.yml` (weekly schedule + PR trigger)
- [ ] 9.2 Add pip-audit for Python dependency scanning
- [ ] 9.3 Add npm audit for Node dependency scanning
- [ ] 9.4 Add bandit for Python SAST
- [ ] 9.5 Add truffleHog for secrets detection
- [ ] 9.6 Wire audit results to GitHub Issues for tracked findings
