## Why

The current prototype is tied to Google Cloud (Vertex AI + Gemini + Cloud Run + Firebase), requires a deployed backend, and has no path for users to bring their own LLM API key. To make this a real tool anyone can download and run locally, we need to strip all cloud dependencies, decouple from a single LLM provider, and re-architect around the MCP protocol so the graph becomes a peripheral reasoning display for any MCP-compatible LLM client. Sessions and settings must persist across restarts like OpenWebUI.

## What Changes

- **CHANGE**: Backend refactored from single `main.py` to dual-mode `teacher_ai.py` entrypoint with `teacher_ai/` package — standalone mode (LiteLLM + WebSocket, BYOK) and MCP mode (protocol-driven, browser as display)
- **BREAKING**: Remove all cloud infrastructure — Firebase hosting, Cloud Run, Dockerfile, GCP configs, Vertex AI SDK
- **BREAKING**: Frontend JS → TypeScript migration (React retained, Svelte deferred)
- **NEW**: LiteLLM for provider abstraction in standalone mode — supports OpenAI, Anthropic, Gemini, Ollama, and 100+ providers via `LLM_PROVIDER` env var
- **NEW**: WebSocket bridge from MCP server to browser for real-time graph updates
- **NEW**: Probe button copies pre-formatted prompt to clipboard instead of sending WebSocket message (MCP mode)
- **NEW**: Persistent session storage (SQLite) — auto-save graphs, browse history, resume sessions
- **NEW**: Settings store (JSON) — user preferences survive restarts
- **NEW**: Config file / env var support for local setup
- **NEW**: CI/CD pipeline with GitHub Actions — lint, type check, test suites, build, and security audit
- **FIX**: Add missing runtime dependencies (`react-markdown`, `remark-math`, `rehype-katex`) to `package.json`
- **REMOVE**: ~295 unused Python dependencies from `requirements.txt`

## Capabilities

### New Capabilities
- `dual-mode`: Single `teacher_ai.py` entrypoint with `--mode standalone|mcp` (default: standalone)
- `byok`: Bring-your-own-key via `LLM_PROVIDER` and `LLM_API_KEY` env vars — works with OpenAI, Anthropic, Gemini, Ollama, and 100+ providers via LiteLLM
- `mcp-server`: MCP server exposing `add_reasoning_node`, `probe_node`, and session management tools, with WebSocket bridge to browser
- `local-setup`: Download-and-run experience — single command starts server + opens browser
- `session-persistence`: SQLite-backed session storage with auto-save, history browsing, resume, and settings persistence
- `ci-cd`: GitHub Actions pipeline with lint, type check, test suites (functional, integration, adversarial, edge case), build, and security audit

### Modified Capabilities
- (none — no existing specs to modify)

## Impact

- `main.py` → kept for backward compat; new `teacher_ai.py` is the primary entrypoint
- `teacher_ai/` package added with `standalone.py`, `mcp_server.py`, `session_manager.py`, `settings.py`, `websocket_server.py`
- `requirements.txt` → stripped of Vertex AI, GCP, and unused ML packages; add `litellm`, `mcp`, `websockets`, `pyperclip`
- `Dockerfile`, `.gcloudignore`, `firebase.json`, `.firebaserc` → removed
- `whiteboard-dashboard/src/*.jsx` → renamed to `.tsx`, types added
- `whiteboard-dashboard/package.json` → add missing deps, add `typescript`, `tsconfig.json`
- `System_Prompt.md` → embedded in MCP tool descriptions
- New files: `.env.example`, `tsconfig.json`, `src/types.ts`, `src/SessionSidebar.tsx`, `src/SettingsPanel.tsx`
