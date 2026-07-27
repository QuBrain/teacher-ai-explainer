## 1. Strip Cloud Infrastructure

- [x] 1.1 Remove `Dockerfile`, `.gcloudignore`, `firebase.json`, `.firebaserc`
- [x] 1.2 Strip `requirements.txt` — remove Vertex AI, GCP, and unused ML packages (keep FastAPI, uvicorn, litellm, mcp, websockets, pyperclip)
- [ ] 1.3 Create `teacher_ai.py` dual-mode entrypoint + `teacher_ai/` package (keep `main.py` for backward compat)

## 2. TypeScript Migration

- [x] 2.1 Add `tsconfig.json` to `whiteboard-dashboard/`
- [x] 2.2 Add missing runtime deps to `package.json`: `react-markdown`, `remark-math`, `rehype-katex`
- [x] 2.3 Add dev deps: `typescript`, `@types/d3-force`
- [x] 2.4 Create `src/types.ts` with `NodeType`, `NodeData`, `ProbeMessage`, `ReasoningNode` interfaces
- [x] 2.5 Rename `main.jsx` → `main.tsx`, add type annotations
- [x] 2.6 Rename `MathNode.jsx` → `MathNode.tsx`, type props with `@xyflow/react` node types
- [x] 2.7 Rename `App.jsx` → `App.tsx`, type WebSocket handler, d3-force simulation, and state
- [x] 2.8 Update `vite.config.js` if needed for TS support
- [x] 2.9 Verify `npm run build` succeeds

## 3. MCP Mode

- [ ] 3.1 Create `teacher_ai/mcp_server.py` with MCP server setup (stdio + SSE transport)
- [ ] 3.2 Implement `add_reasoning_node` tool handler
- [ ] 3.3 Implement `probe_node` tool handler with clipboard support
- [ ] 3.4 Implement `list_sessions` tool handler
- [ ] 3.5 Implement `load_session` tool handler
- [ ] 3.6 Implement `delete_session` tool handler
- [ ] 3.7 Implement `rename_session` tool handler
- [ ] 3.8 Embed system prompt in tool descriptions

## 4. WebSocket Bridge (shared)

- [ ] 4.1 Create `teacher_ai/websocket_server.py` with shared WS broadcast
- [ ] 4.2 Implement broadcast on `add_reasoning_node` call
- [ ] 4.3 Implement full graph state send on client connect
- [ ] 4.4 Implement session switch broadcast on `load_session` call
- [ ] 4.5 Update frontend WebSocket URL to point to local server

## 5. Session Persistence (shared)

- [x] 5.1 Create `teacher_ai/session_manager.py` with SQLite schema
- [x] 5.2 Implement `SessionManager` class with CRUD operations
- [x] 5.3 Wire auto-save into `add_reasoning_node` handler
- [x] 5.4 Implement last-session auto-restore on startup
- [x] 5.5 Create `teacher_ai/settings.py` for JSON settings store

## 6. Frontend Updates

- [ ] 6.1 Replace probe WebSocket send with clipboard copy (MCP mode only)
- [ ] 6.2 Add session sidebar component (`SessionSidebar.tsx`)
- [ ] 6.3 Add settings panel component (`SettingsPanel.tsx`)
- [ ] 6.4 Update `App.tsx` to handle full graph state on connect
- [ ] 6.5 Update `App.tsx` to handle session switch events

## 7. Local Setup & Launch

- [ ] 7.1 Add frontend build check + auto-build in `teacher_ai.py` startup
- [ ] 7.2 Add static file serving for built frontend
- [ ] 7.3 Add browser auto-launch on startup
- [ ] 7.4 Create `.env.example` with available config options
- [ ] 7.5 Add port fallback logic for WebSocket server
- [ ] 7.6 Test full flow: `python teacher_ai.py --mode mcp` → connect LLM client → ask question → see graph

## 8. CI/CD Pipeline

- [x] 8.1 Create `.github/workflows/ci.yml` with matrix (Python 3.11, 3.12)
- [x] 8.2 Write functional test suite (pytest): SQLite, WebSocket
- [ ] 8.3 Write integration test suite: MCP → WS → browser handshake
- [x] 8.4 Write adversarial test suite: flood, injection, XSS, RCE paths
- [x] 8.5 Write edge case test suite: large graphs, concurrent, corrupt DB
- [x] 8.6 Add frontend tests (vitest): component render, probe clipboard
- [x] 8.7 Add lint configs: ruff (Python), eslint (frontend)
- [x] 8.8 Add type check configs: tsc (frontend)
- [ ] 8.9 Add coverage reporting (pytest-cov, vitest --coverage)
- [ ] 8.10 Add rate limiter to WebSocket server (token-bucket, 30/sec)
- [ ] 8.11 Add input sanitization (content length limits, strip HTML)
- [ ] 8.12 Add subprocess path validation for npm build

## 9. Security Audit Pipeline

- [x] 9.1 Create `.github/workflows/audit.yml` (weekly schedule + PR trigger)
- [x] 9.2 Add pip-audit for Python dependency scanning
- [x] 9.3 Add npm audit for Node dependency scanning
- [x] 9.4 Add bandit for Python SAST
- [x] 9.5 Add truffleHog for secrets detection
- [ ] 9.6 Wire audit results to GitHub Issues for tracked findings

## 10. Standalone Mode Refactor

- [ ] 10.1 Extract `main.py` WebSocket + Gemini logic into `teacher_ai/standalone.py` using LiteLLM
- [ ] 10.2 Create `teacher_ai/websocket_server.py` shared WS broadcast module
- [ ] 10.3 Create `teacher_ai/__init__.py`
- [ ] 10.4 Wire standalone mode into `teacher_ai.py` entrypoint
- [ ] 10.5 Verify `python teacher_ai.py` works identically to `uvicorn main:app`
- [ ] 10.6 Add LiteLLM to `requirements.txt`
