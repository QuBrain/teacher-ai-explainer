## ADDED Requirements

### Requirement: Sessions auto-save to SQLite
Every node added via `add_reasoning_node` SHALL be automatically saved to a SQLite database at `~/.teacher-ai-explainer/sessions.db`. No manual save action is required.

#### Scenario: Node added during session
- **WHEN** the LLM client calls `add_reasoning_node`
- **THEN** the node is saved to the SQLite database with session_id, node_id, type, label, content, parent_id, and position

#### Scenario: Multiple sessions
- **WHEN** the user starts a new session
- **THEN** a new session record is created in SQLite
- **THEN** subsequent nodes are associated with the new session

### Requirement: Sessions are browsable and resumable
The system SHALL provide a session sidebar in the browser UI listing all saved sessions with titles and timestamps. Users SHALL be able to click a session to restore its full graph state.

#### Scenario: User browses sessions
- **WHEN** the user opens the application
- **THEN** the session sidebar shows a list of all saved sessions with title, date, and node count

#### Scenario: User resumes a session
- **WHEN** the user clicks a session in the sidebar
- **THEN** the graph restores all nodes, edges, and positions for that session
- **THEN** the session becomes the active session for new nodes

### Requirement: Last session auto-restores on startup
When the application starts, it SHALL automatically load the most recently active session.

#### Scenario: Application restarts
- **WHEN** the user restarts the application
- **THEN** the last active session is loaded
- **THEN** the graph displays the previous state

### Requirement: Session titles are editable
Users SHALL be able to rename sessions. New sessions SHALL auto-generate a title from the first question text.

#### Scenario: Auto-generate session title
- **WHEN** a new session is created and the first node is added
- **THEN** the session title is set to the first question text (truncated to 80 chars)

#### Scenario: Rename session
- **WHEN** the user renames a session via the sidebar
- **THEN** the new name is saved to SQLite

### Requirement: Settings persist across restarts
User preferences (theme, default view, port, etc.) SHALL be saved to `~/.teacher-ai-explainer/settings.json` and restored on application start.

#### Scenario: User changes a setting
- **WHEN** the user changes a setting in the UI
- **THEN** the setting is saved to `settings.json` immediately
- **THEN** the setting is applied on next application start

### Requirement: Sessions can be deleted
Users SHALL be able to delete sessions from the sidebar. Deletion SHALL remove all associated nodes and edges from SQLite.

#### Scenario: User deletes a session
- **WHEN** the user deletes a session from the sidebar
- **THEN** the session and all its nodes/edges are removed from SQLite
- **THEN** the session is removed from the sidebar
