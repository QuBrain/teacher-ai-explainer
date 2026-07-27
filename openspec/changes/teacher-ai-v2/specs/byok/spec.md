## ADDED Requirements

### Requirement: Server requires no API keys
The MCP server SHALL NOT require any API keys or cloud credentials. All LLM API keys are managed by the user's LLM client (Claude Desktop, opencode, etc.).

#### Scenario: Server starts without any API keys
- **WHEN** the user starts the MCP server without any API keys configured
- **THEN** the server starts successfully and is ready for LLM client connections

### Requirement: Config file for user preferences
The system SHALL read user preferences from `~/.teacher-ai-explainer/settings.json`, including theme, default view, and other UI preferences.

#### Scenario: Settings file exists
- **WHEN** the application starts and `~/.teacher-ai-explainer/settings.json` exists
- **THEN** the system loads and applies the settings

#### Scenario: Settings file does not exist
- **WHEN** the application starts and `~/.teacher-ai-explainer/settings.json` does not exist
- **THEN** the system creates it with default values

### Requirement: Environment variable support
The system SHALL support environment variables for configuration, with env vars overriding config file values.

#### Scenario: Env var overrides config file
- **WHEN** both `TEACHER_AI_PORT` env var and a port in `settings.json` are set
- **THEN** the env var value takes precedence
