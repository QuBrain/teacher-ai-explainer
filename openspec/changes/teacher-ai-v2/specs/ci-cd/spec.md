## ADDED Requirements

### Requirement: CI pipeline runs on every PR and push to main
GitHub Actions SHALL run lint, type check, unit tests, integration tests, adversarial tests, edge case tests, and build on every PR and push to main. The pipeline SHALL use a matrix strategy across Python 3.11 and 3.12.

#### Scenario: PR opened
- **WHEN** a PR is opened against main
- **THEN** the CI pipeline runs all stages
- **THEN** the PR shows check status for each stage

#### Scenario: Push to main
- **WHEN** code is pushed to main
- **THEN** the CI pipeline runs all stages
- **THEN** a failure blocks further merges

### Requirement: Functional tests cover all MCP tools
Tests SHALL verify `add_reasoning_node`, `probe_node`, `list_sessions`, `load_session`, `delete_session`, `rename_session` with valid inputs, missing fields, invalid types, and nonexistent session IDs.

#### Scenario: add_reasoning_node with valid data
- **WHEN** the test calls `add_reasoning_node` with valid arguments
- **THEN** the node is saved to SQLite
- **THEN** the node is broadcast via WebSocket
- **THEN** the tool returns success

#### Scenario: add_reasoning_node with missing fields
- **WHEN** the test calls `add_reasoning_node` without required fields
- **THEN** the tool returns an error response

### Requirement: Integration tests cover MCP to WebSocket to browser handshake
Tests SHALL verify the full data flow: MCP tool call triggers WebSocket broadcast, browser client receives the correct message, session switch propagates full graph state.

#### Scenario: Node added propagates to WebSocket client
- **WHEN** a test WebSocket client is connected
- **WHEN** `add_reasoning_node` is called via MCP
- **THEN** the WebSocket client receives the node data

#### Scenario: Session switch propagates full graph
- **WHEN** `load_session` is called via MCP
- **THEN** the WebSocket client receives the full graph state of that session

### Requirement: Adversarial tests cover security boundaries
Tests SHALL verify: WebSocket flood (rate limiter rejects excess), SQL injection (parameterized queries prevent it), XSS (content sanitized before broadcast), prompt injection (content length limits enforced), RCE (subprocess paths validated).

#### Scenario: WebSocket flood is rate-limited
- **WHEN** a client sends more than 30 messages per second
- **THEN** the server returns a rate-limit error
- **THEN** the server does not crash

#### Scenario: SQL injection is prevented
- **WHEN** a tool call includes SQL injection payloads in string fields
- **THEN** the payloads are treated as data, not executed
- **THEN** the database is not corrupted

#### Scenario: XSS is prevented
- **WHEN** a tool call includes HTML/script tags in content
- **THEN** the content is sanitized before WebSocket broadcast
- **THEN** the browser renders the content as text, not HTML

#### Scenario: RCE via subprocess is prevented
- **WHEN** the server runs a subprocess (npm build)
- **THEN** the command path is validated against a whitelist
- **THEN** user-controlled input is not passed to the shell

### Requirement: Edge case tests cover extreme conditions
Tests SHALL verify: 1000+ node graphs, 100-level tree depth, huge LaTeX (100KB+), 50 concurrent WebSocket connections, port conflicts, empty/corrupt SQLite DB, missing clipboard.

#### Scenario: Large graph with 1000 nodes
- **WHEN** 1000 nodes are added to a session
- **THEN** all nodes are saved to SQLite
- **THEN** the session loads correctly
- **THEN** the WebSocket broadcasts all nodes

#### Scenario: Corrupt SQLite database
- **WHEN** the SQLite database file is corrupt
- **THEN** the server starts with a fresh database
- **THEN** an error is logged about the corruption

### Requirement: Rate limiter on WebSocket server
The WebSocket server SHALL implement a token-bucket rate limiter with a maximum of 30 messages per second per connection and a maximum burst of 60 messages.

#### Scenario: Rate limiter allows normal traffic
- **WHEN** a client sends 25 messages in one second
- **THEN** all messages are processed normally

#### Scenario: Rate limiter blocks excess traffic
- **WHEN** a client sends 40 messages in one second
- **THEN** messages beyond the limit are rejected with a rate-limit error

### Requirement: Input sanitization
All string inputs SHALL be length-limited: content to 100KB, label to 200 characters, id to 100 characters. Content SHALL be sanitized to strip HTML tags before WebSocket broadcast. All database queries SHALL use parameterized statements.

#### Scenario: Content exceeds length limit
- **WHEN** a tool call includes content exceeding 100KB
- **THEN** the content is truncated to 100KB
- **THEN** the truncated content is saved and broadcast

#### Scenario: HTML tags in content
- **WHEN** a tool call includes HTML tags in content
- **THEN** the tags are stripped before WebSocket broadcast
- **THEN** the original content (with tags) is saved to SQLite

## ADDED Requirements (Audit)

### Requirement: Security audit pipeline runs weekly
A scheduled GitHub Actions workflow SHALL run weekly (Sunday) to audit dependencies, scan for secrets, and run SAST analysis.

#### Scenario: Scheduled audit runs
- **WHEN** the scheduled workflow triggers
- **THEN** dependency scanning runs (pip-audit, npm audit)
- **THEN** SAST analysis runs (bandit for Python)
- **THEN** secrets scanning runs (truffleHog or Gitleaks)
- **THEN** results are reported to the security dashboard

### Requirement: Dependency scanning
The audit pipeline SHALL scan Python dependencies with `pip-audit` and Node dependencies with `npm audit`. Failures SHALL be reported but not block the pipeline.

#### Scenario: Vulnerable dependency found
- **WHEN** a dependency has a known vulnerability
- **THEN** the audit report includes the vulnerability details
- **THEN** a GitHub issue is created for the vulnerability

### Requirement: SAST analysis
The audit pipeline SHALL run `bandit` on Python code and `eslint-plugin-security` on frontend code to detect common security anti-patterns.

#### Scenario: SAST finds a security issue
- **WHEN** bandit or eslint-plugin-security detects a security issue
- **THEN** the issue is reported with file, line, and severity
- **THEN** the pipeline continues (non-blocking)

### Requirement: Secrets detection
The audit pipeline SHALL scan the repository for accidentally committed secrets (API keys, tokens, passwords) using `truffleHog` or `Gitleaks`.

#### Scenario: Secret detected in commit
- **WHEN** a secret is detected in the repository
- **THEN** the audit report includes the file and secret type
- **THEN** the pipeline fails
