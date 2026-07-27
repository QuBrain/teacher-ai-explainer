# JSON settings store — persists user preferences across restarts.
# Stored at ~/.teacher-ai-explainer/settings.json

import json
from pathlib import Path

SETTINGS_PATH = Path.home() / ".teacher-ai-explainer" / "settings.json"

DEFAULT_SETTINGS = {
    "last_session_id": None,
    "ws_port": 8000,
    "browser_auto_launch": True,
}


class Settings:
    def __init__(self, path: Path = SETTINGS_PATH):
        self._path = path
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._data = dict(DEFAULT_SETTINGS)
        self._load()

    def _load(self):
        if self._path.exists():
            try:
                with open(self._path) as f:
                    self._data.update(json.load(f))
            except (json.JSONDecodeError, OSError):
                pass

    def _save(self):
        with open(self._path, "w") as f:
            json.dump(self._data, f, indent=2)

    def get(self, key: str, default=None):
        return self._data.get(key, default)

    def set(self, key: str, value):
        self._data[key] = value
        self._save()
