# SQLite-backed session persistence for reasoning graphs.
# Auto-saves nodes and edges per session, supports browse, resume, and delete.

import sqlite3
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path

DB_DIR = Path.home() / ".teacher-ai-explainer"
DB_PATH = DB_DIR / "sessions.db"

# Schema: sessions, nodes, edges
SCHEMA = """
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT 'New Session',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS nodes (
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

CREATE TABLE IF NOT EXISTS edges (
    id TEXT NOT NULL,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    source TEXT NOT NULL,
    target TEXT NOT NULL,
    PRIMARY KEY (id, session_id)
);
"""


class SessionManager:
    def __init__(self, db_path: str | Path = DB_PATH):
        self._db_path = Path(db_path)
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        self._local = threading.local()

    def _conn(self) -> sqlite3.Connection:
        if not hasattr(self._local, "conn") or self._local.conn is None:
            self._local.conn = sqlite3.connect(str(self._db_path))
            self._local.conn.row_factory = sqlite3.Row
            self._local.conn.execute("PRAGMA journal_mode=WAL")
            self._local.conn.execute("PRAGMA foreign_keys=ON")
            self._local.conn.executescript(SCHEMA)
        return self._local.conn

    # --- Sessions ---

    def create_session(self, title: str = "New Session") -> dict:
        session_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        self._conn().execute(
            "INSERT INTO sessions (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
            (session_id, title, now, now),
        )
        self._conn().commit()
        return self.get_session(session_id)

    def get_session(self, session_id: str) -> dict | None:
        row = self._conn().execute(
            "SELECT id, title, created_at, updated_at FROM sessions WHERE id = ?",
            (session_id,),
        ).fetchone()
        if row is None:
            return None
        return dict(row)

    def list_sessions(self) -> list[dict]:
        rows = self._conn().execute(
            "SELECT s.id, s.title, s.created_at, s.updated_at, "
            "COUNT(n.id) AS node_count "
            "FROM sessions s LEFT JOIN nodes n ON n.session_id = s.id "
            "GROUP BY s.id ORDER BY s.updated_at DESC"
        ).fetchall()
        return [dict(r) for r in rows]

    def rename_session(self, session_id: str, title: str) -> bool:
        now = datetime.now(timezone.utc).isoformat()
        cur = self._conn().execute(
            "UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?",
            (title, now, session_id),
        )
        self._conn().commit()
        return cur.rowcount > 0

    def delete_session(self, session_id: str) -> bool:
        cur = self._conn().execute("DELETE FROM sessions WHERE id = ?", (session_id,))
        self._conn().commit()
        return cur.rowcount > 0

    # --- Nodes ---

    def add_node(
        self,
        session_id: str,
        node_id: str,
        node_type: str,
        label: str,
        content: str,
        parent_id: str | None = None,
        position_x: float | None = None,
        position_y: float | None = None,
    ) -> bool:
        now = datetime.now(timezone.utc).isoformat()
        self._conn().execute(
            "INSERT OR IGNORE INTO nodes (id, session_id, node_type, label, content, "
            "parent_id, position_x, position_y, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (node_id, session_id, node_type, label, content,
             parent_id, position_x, position_y, now),
        )
        # Touch session updated_at
        self._conn().execute(
            "UPDATE sessions SET updated_at = ? WHERE id = ?", (now, session_id)
        )
        self._conn().commit()
        return True

    def get_nodes(self, session_id: str) -> list[dict]:
        rows = self._conn().execute(
            "SELECT id, node_type, label, content, parent_id, position_x, position_y "
            "FROM nodes WHERE session_id = ? ORDER BY created_at",
            (session_id,),
        ).fetchall()
        return [dict(r) for r in rows]

    # --- Edges ---

    def add_edge(self, session_id: str, edge_id: str, source: str, target: str) -> bool:
        self._conn().execute(
            "INSERT OR IGNORE INTO edges (id, session_id, source, target) VALUES (?, ?, ?, ?)",
            (edge_id, session_id, source, target),
        )
        self._conn().commit()
        return True

    def get_edges(self, session_id: str) -> list[dict]:
        rows = self._conn().execute(
            "SELECT id, source, target FROM edges WHERE session_id = ?", (session_id,)
        ).fetchall()
        return [dict(r) for r in rows]

    # --- Full graph ---

    def get_full_graph(self, session_id: str) -> dict | None:
        session = self.get_session(session_id)
        if session is None:
            return None
        return {
            **session,
            "nodes": self.get_nodes(session_id),
            "edges": self.get_edges(session_id),
        }
