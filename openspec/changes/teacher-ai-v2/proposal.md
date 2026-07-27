## Why

The current prototype is tied to Google Cloud (Vertex AI + Gemini + Cloud Run + Firebase), requires a deployed backend, and has no path for users to bring their own LLM API key. To make this a real tool anyone can download and run locally, we need to strip all cloud dependencies, decouple from a single LLM provider, and re-architect around the MCP protocol so the graph becomes a peripheral reasoning display for any MCP-compatible LLM client. Sessions and settings must persist across restarts like OpenWebUI.

## What Changes

- **BREAKING**: Rewrite backend from FastAPI + Vertex AI to an MCP server (Python) with `add_reasoning_node`, `probe_node`, and session management tools
- **BREAKING**: Remove all cloud infrastructure — Firebase hosting, Cloud Run, Dockerfile, GCP configs, Vertex AI SDK
- **BREAKING**: Frontend JS → TypeScript migration (React retained, Svelte deferred)
- **NEW**: WebSocket bridge from MCP server to browser for real-time graph updates
- **NEW**: Probe button copies pre-formatted prompt to clipboard instead of sending WebSocket message
- **NEW**: Persistent session storage (SQLite) — auto-save graphs, browse history, resume sessions
- **NEW**: Settings store (JSON) — user preferences survive restarts
- **NEW**: Config file / env var support for local setup
- **NEW**: CI/CD pipeline with GitHub Actions — functional, integration, adversarial, and edge case test suites
- **NEW**: Security audit pipeline — dependency scanning, SAST, secrets detection
- **FIX**: Add missing runtime dependencies (`react-markdown`, `remark-math`, `rehype-katex`) to `package.json`
- **REMOVE**: ~50 unused Python dependencies from `requirements.txt`

## Capabilities

### New Capabilities
- `mcp-server`: MCP server exposing `add_reasoning_node`, `probe_node`, and session management tools, with WebSocket bridge to browser
- `local-setup`: Download-and-run experience — single command starts MCP server + opens browser
- `byok`: Bring-your-own-key via config file or env vars (user's LLM client handles its own keys; server needs none)
- `session-persistence`: SQLite-backed session storage with auto-save, history browsing, resume, and settings persistence
- `ci-cd`: GitHub Actions pipeline with lint, type check, test suites (functional, integration, adversarial, edge case), build, and security audit

### Modified Capabilities
- (none — no existing specs to modify)

## Impact

- `main.py` → replaced by `teacher_ai_mcp.py` (MCP server)
- `requirements.txt` → stripped of Vertex AI, GCP, and unused ML packages
- `Dockerfile`, `.gcloudignore`, `firebase.json`, `.firebaserc` → removed
- `whiteboard-dashboard/src/*.jsx` → renamed to `.tsx`, types added
- `whiteboard-dashboard/package.json` → add missing deps, add `typescript`, `tsconfig.json`
- `System_Prompt.md` → embedded in MCP tool descriptions
- New files: `.env.example`, `tsconfig.json`, `src/types.ts`, `src/SessionSidebar.tsx`, `src/SettingsPanel.tsx`
