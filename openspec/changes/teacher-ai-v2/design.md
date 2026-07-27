## Context

The current prototype is a FastAPI backend with a hardcoded Gemini Vertex AI client, serving a React frontend deployed on Firebase. The backend owns the LLM call loop, the API key, and the provider choice. To make this a local-first tool, we re-architect around the MCP protocol: the backend becomes an MCP server that exposes graph-building tools, and the user's LLM client (Claude Desktop, opencode, etc.) drives the conversation. The browser becomes a peripheral display for the reasoning graph.

## Goals / Non-Goals

**Goals:**
- MCP server with `add_reasoning_node`, `probe_node`, and session management tools
- WebSocket bridge for real-time graph updates in the browser
- SQLite-backed session persistence with auto-save, browse, resume
- Settings persistence via JSON config file
- TypeScript migration of the frontend
- Single-command local startup (server + browser)
- Zero cloud dependencies, zero server-side API keys

**Non-Goals:**
- Multi-user support (single-user local tool)
- LLM provider abstraction in the server (the user's LLM client handles this)
- Svelte migration (deferred)
- Authentication or authorization

## Decisions

### Decision: MCP server in Python with `mcp` SDK
Use the official Python `mcp` library (already in requirements.txt). It supports both stdio transport (for CLI clients like opencode) and SSE transport (for Claude Desktop). The server runs as a standalone process.

**Alternatives considered:**
- Node.js MCP server: Would unify the stack but requires rewriting the backend. Python keeps the existing logic and the `mcp` SDK is mature.
- Raw stdio protocol: Too low-level. The SDK handles JSON-RPC framing, tool registration, and error handling.

### Decision: WebSocket server alongside MCP server
Run a separate WebSocket server (using `websockets` library) on a different port alongside the MCP server. The MCP server's tool handlers broadcast to WebSocket clients.

**Alternatives considered:**
- Embed WebSocket in MCP server: The MCP SDK doesn't natively support WebSocket. Running them side-by-side is simpler.
- SSE from MCP server to browser: Browsers can consume SSE, but WebSocket is bidirectional (needed for future features like session switching from the browser).

### Decision: SQLite via stdlib `sqlite3`
Use Python's built-in `sqlite3` module. No ORM, no migration framework. The schema is simple (3 tables: sessions, nodes, edges).

**Alternatives considered:**
- SQLAlchemy: Overkill for 3 tables. Adds a dependency.
- JSON file storage: Would work but doesn't scale to many sessions. SQLite is simpler for querying (list sessions sorted by date, count nodes per session, etc.).

### Decision: Clipboard via `pyperclip`
Use `pyperclip` for cross-platform clipboard access when the probe tool is called. Falls back to printing the prompt to stdout if clipboard is unavailable.

**Alternatives considered:**
- Platform-specific commands (`xclip`, `pbcopy`, `clip`): Works but requires platform detection. `pyperclip` handles this.

### Decision: Frontend build automation via subprocess
The Python server checks if `whiteboard-dashboard/dist/` exists on startup. If not, it runs `npm install && npm run build` via subprocess. This keeps the setup friction-free.

**Alternatives considered:**
- Require manual build: More steps for the user. Bad for "download and run."
- Bundle frontend in Python package: Complex. Subprocess is simpler.

### Decision: TypeScript migration with minimal types
Add a `tsconfig.json`, rename `.jsx` to `.tsx`, and define interfaces for the core data types (NodeData, ProbeMessage, ReasoningNode). Use `@xyflow/react`'s built-in types. No strict mode initially — pragmatic over purity.

**Alternatives considered:**
- Full strict TypeScript: Would require more refactoring of the d3-force mutation pattern. Start lenient, tighten later.
- Keep JS: Loses the benefits of type safety for the WebSocket protocol. Not worth it.

### Decision: Session auto-restore on startup
The server stores the last active session ID in `settings.json`. On startup, it loads that session and sends the graph state to the browser on WebSocket connect.

**Alternatives considered:**
- Always start fresh: Users lose their last session. Bad UX.
- Show session picker on startup: More complex. Auto-restore with a sidebar to switch is simpler.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ teacher_ai_mcp.py                                            │
│                                                              │
│  ┌─────────────────┐    ┌──────────────────┐                │
│  │ MCP Server       │    │ WebSocket Server │                │
│  │ (mcp SDK)        │    │ (websockets)     │                │
│  │                  │    │                  │                │
│  │ Tools:           │    │ Broadcasts:      │                │
│  │  add_reasoning   │    │  node_added      │                │
│  │  _node           │────│  session_loaded  │◄── Browser    │
│  │  probe_node      │    │  full_graph      │   (React+TS)  │
│  │  list_sessions   │    └────────┬─────────┘                │
│  │  load_session    │             │                          │
│  │  delete_session  │    ┌───────┴────────┐                 │
│  │  rename_session  │    │ Session Manager │                 │
│  └────────┬─────────┘    │ (SQLite)        │                 │
│           │              └─────────────────┘                 │
│           │ MCP (stdio/SSE)                                  │
│           ▼                                                  │
│  ┌──────────────────┐    ┌──────────────────┐                │
│  │ LLM Client       │    │ Settings Store   │                │
│  │ (Claude Desktop, │    │ (JSON file)      │                │
│  │  opencode, etc.) │    └──────────────────┘                │
│  └──────────────────┘                                        │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. User starts app: `python teacher_ai_mcp.py`
2. Server checks for built frontend, builds if needed
3. Server starts MCP server (stdio + SSE) and WebSocket server
4. Browser opens to `http://localhost:<port>`, connects WebSocket
5. Server sends full graph state of last active session
6. User connects LLM client to MCP server
7. User asks a question in LLM client
8. LLM calls `add_reasoning_node` → server broadcasts to browser + saves to SQLite
9. User clicks `?` on a node → copies probe prompt to clipboard
10. User pastes into LLM client → LLM calls `add_reasoning_node` with `Alternative` type

### SQLite Schema

```sql
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT 'New Session',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE nodes (
    id TEXT NOT NULL,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    node_type TEXT NOT NULL,
    label TEXT NOT NULL,
    content TEXT NOT NULL,
    parent_id TEXT,
    position_x REAL,
    position_y REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (id, session_id)
);

CREATE TABLE edges (
    id TEXT NOT NULL,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    source TEXT NOT NULL,
    target TEXT NOT NULL,
    PRIMARY KEY (id, session_id)
);
```

### MCP Tool Definitions

```
add_reasoning_node(id, label, content, node_type, parent_id?)
  → broadcasts to WebSocket, saves to SQLite, returns {status: "success"}

probe_node(parent_id, content)
  → copies prompt to clipboard, returns prompt text

list_sessions()
  → returns [{id, title, created_at, updated_at, node_count}]

load_session(id)
  → sets active session, broadcasts full graph to WebSocket

delete_session(id)
  → removes session + nodes + edges from SQLite

rename_session(id, title)
  → updates session title in SQLite
```

## Test Strategy

**Isolation:** In-memory SQLite for all tests. Mock MCP transport layer. `asyncio` test helpers for WebSocket. Tests use `pytest-asyncio` for async test functions.

**Pipeline stages (in order):**
1. **Lint** — `ruff` (Python), `eslint` (frontend)
2. **Type check** — `mypy` (Python), `tsc --noEmit` (frontend)
3. **Unit tests** — `pytest` (Python), `vitest` (frontend)
4. **Integration tests** — MCP → WebSocket → browser handshake
5. **Adversarial tests** — flood, injection, XSS, RCE paths
6. **Edge case tests** — large graphs, concurrent, corrupt DB
7. **Build** — `npm run build`, verify server starts
8. **Audit** — dependency scan, SAST, secrets detection (weekly scheduled)

**Rate limiter:** Token-bucket algorithm, 30 tokens/sec per connection, max burst 60. Returns `{"error": "rate_limit", "retry_after": 0.033}` on throttle. Implemented as an `asyncio` middleware on the WebSocket server.

**Input sanitization:**
- Content truncated at 100KB, labels at 200 chars, IDs at 100 chars
- HTML tags stripped via regex before WebSocket broadcast
- Original content (with tags) preserved in SQLite
- All database queries use parameterized statements exclusively
- Subprocess paths validated against a whitelist (`["npm", "node", "npx"]`)

**Test data generators:**
- `generate_tree(depth, breadth)` — creates a balanced tree of nodes for large-graph tests
- `generate_latex(size)` — generates LaTeX math of specified size
- `generate_injection_payloads()` — returns a list of SQL/XSS/prompt injection strings

**Coverage targets:**
- Python: 90%+ line coverage (pytest-cov)
- Frontend: 80%+ line coverage (vitest --coverage)
- Coverage enforced on CI (non-blocking, reported as comment)

## Security Audit

**Weekly scheduled workflow** (Sunday 00:00 UTC):
- `pip-audit` — Python dependency vulnerabilities
- `npm audit` — Node dependency vulnerabilities
- `bandit` — Python SAST
- `truffleHog` — Secrets scanning
- Results posted as a GitHub issue if findings exist

**PR audit gate:**
- `pip-audit` runs on every PR (non-blocking, warning only)
- `truffleHog` runs on every PR (blocking if secrets found)

## Risks / Trade-offs

- **[Risk] MCP SDK maturity**: The Python MCP SDK is relatively new. If it has bugs, fall back to raw stdio JSON-RPC. **Mitigation**: Pin a known-good version in requirements.txt.
- **[Risk] WebSocket port conflict**: If the default port is in use, the server should pick a random port and print it. **Mitigation**: Port fallback logic in the launcher.
- **[Risk] Clipboard fails in headless environments**: `pyperclip` may fail on systems without a clipboard (WSL, SSH). **Mitigation**: Fall back to printing the prompt to stdout.
- **[Trade-off] Two ports**: MCP server and WebSocket server run on different ports. Slightly more complex than a single-port solution, but each protocol gets its own lifecycle.
- **[Trade-off] No LLM abstraction in server**: The server doesn't call any LLM. This means the probe feature can't auto-generate explanations — it only copies to clipboard. The user pastes and asks manually. This is a deliberate tradeoff for simplicity and true BYOK.
