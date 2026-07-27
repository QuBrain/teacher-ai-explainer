## ADDED Requirements

### Requirement: MCP server exposes add_reasoning_node tool
The MCP server SHALL expose a tool named `add_reasoning_node` that accepts `id`, `label`, `content` (LaTeX), `node_type` (Given, Objective, Principle, Derivation, Self-Correction, Alternative, Final Answer), and optional `parent_id`. The server SHALL broadcast the node to all connected browser clients via WebSocket and auto-save to the active session.

#### Scenario: LLM calls add_reasoning_node
- **WHEN** the LLM client calls `add_reasoning_node` with valid arguments
- **THEN** the server broadcasts the node to the browser via WebSocket
- **THEN** the server saves the node to the active session in SQLite
- **THEN** the server returns `{"status": "success"}` to the LLM client

#### Scenario: add_reasoning_node with missing required fields
- **WHEN** the LLM client calls `add_reasoning_node` without `id`, `label`, `content`, or `node_type`
- **THEN** the server returns an error response describing the missing field

### Requirement: MCP server exposes probe_node tool
The MCP server SHALL expose a tool named `probe_node` that accepts `parent_id` and `content`. The server SHALL copy a pre-formatted prompt to the system clipboard and return the prompt text to the LLM client.

#### Scenario: LLM calls probe_node
- **WHEN** the LLM client calls `probe_node` with `parent_id` and `content`
- **THEN** the server copies a pre-formatted prompt to the clipboard
- **THEN** the server returns the prompt text to the LLM client

### Requirement: MCP server exposes session management tools
The MCP server SHALL expose `list_sessions`, `load_session`, `delete_session`, and `rename_session` tools for browsing and managing saved sessions.

#### Scenario: List all sessions
- **WHEN** the LLM client calls `list_sessions`
- **THEN** the server returns a list of sessions with id, title, created_at, updated_at, and node_count

#### Scenario: Load a specific session
- **WHEN** the LLM client calls `load_session` with a valid session id
- **THEN** the server loads that session as active and broadcasts the full graph state to the browser

#### Scenario: Delete a session
- **WHEN** the LLM client calls `delete_session` with a valid session id
- **THEN** the server removes the session and all its nodes/edges from SQLite

### Requirement: WebSocket bridge broadcasts graph state
The MCP server SHALL run a WebSocket server that browser clients connect to. The server SHALL broadcast node additions, session switches, and full graph state on connect.

#### Scenario: Browser connects to WebSocket
- **WHEN** a browser client connects to the WebSocket
- **THEN** the server sends the full graph state of the active session

#### Scenario: Node added during active session
- **WHEN** a node is added via `add_reasoning_node`
- **THEN** the server broadcasts the node data to all connected browser clients

### Requirement: System prompt embedded in tool descriptions
The MCP server SHALL embed the pedagogical system instructions (Given → Principle → Derivation → Self-Correction → Final Answer methodology) in the tool descriptions so the LLM client can present them to the model.

#### Scenario: LLM client reads tool descriptions
- **WHEN** the LLM client connects to the MCP server and reads tool descriptions
- **THEN** the descriptions SHALL include the reasoning methodology and node type taxonomy
