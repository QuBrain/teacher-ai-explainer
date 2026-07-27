## ADDED Requirements

### Requirement: Single command starts the application
The system SHALL provide a single command (`python teacher_ai_mcp.py` or equivalent) that starts the MCP server, launches the browser, and is ready for LLM client connections.

#### Scenario: User runs the start command
- **WHEN** the user runs `python teacher_ai_mcp.py`
- **THEN** the MCP server starts on localhost
- **THEN** the browser opens to the graph UI
- **THEN** the server prints the MCP connection URL for the LLM client

### Requirement: Frontend is served locally
The MCP server SHALL serve the built frontend (React + TS) as static files on an HTTP endpoint, so no separate hosting is needed.

#### Scenario: Browser loads the frontend
- **WHEN** the user opens `http://localhost:<port>` in a browser
- **THEN** the React application loads and connects to the WebSocket

### Requirement: Frontend build is automated
The system SHALL provide a build script that compiles the TypeScript frontend to static files before the server starts.

#### Scenario: First-time setup
- **WHEN** the user runs the application for the first time
- **THEN** the system checks if the frontend is built
- **THEN** if not built, the system runs `npm install && npm run build` automatically

### Requirement: No cloud dependencies
The system SHALL run entirely on the local machine with no external cloud services, no API keys on the server side, and no internet requirement beyond the user's LLM API calls.

#### Scenario: Offline-capable graph UI
- **WHEN** the user runs the application without internet
- **THEN** the graph UI loads and functions (only LLM calls require internet)
