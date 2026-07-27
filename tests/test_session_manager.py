"""Tests for SQLite session persistence — CRUD operations on sessions, nodes, and edges."""

import tempfile
from pathlib import Path

from teacher_ai.session_manager import SessionManager


def test_create_and_get_session():
    """Create a session with a custom title and verify it can be retrieved by ID."""
    with tempfile.TemporaryDirectory() as tmp:
        mgr = SessionManager(Path(tmp) / "test.db")
        sess = mgr.create_session("Test Session")
        assert sess["title"] == "Test Session"
        assert sess["id"] is not None

        fetched = mgr.get_session(sess["id"])
        assert fetched["title"] == "Test Session"


def test_add_and_get_nodes():
    """Add two nodes (one with a parent reference) and verify they are stored and retrievable."""
    with tempfile.TemporaryDirectory() as tmp:
        mgr = SessionManager(Path(tmp) / "test.db")
        sess = mgr.create_session()
        mgr.add_node(sess["id"], "n1", "Given", "Step 1", "$x = 1$")
        mgr.add_node(sess["id"], "n2", "Derivation", "Step 2", "$x = 2$", parent_id="n1")

        nodes = mgr.get_nodes(sess["id"])
        assert len(nodes) == 2
        assert nodes[0]["node_type"] == "Given"
        assert nodes[1]["parent_id"] == "n1"


def test_add_and_get_edges():
    """Add an edge between two nodes and verify it is stored correctly."""
    with tempfile.TemporaryDirectory() as tmp:
        mgr = SessionManager(Path(tmp) / "test.db")
        sess = mgr.create_session()
        mgr.add_edge(sess["id"], "e-1-2", "n1", "n2")
        edges = mgr.get_edges(sess["id"])
        assert len(edges) == 1
        assert edges[0]["source"] == "n1"


def test_list_sessions():
    """Create multiple sessions and verify list_sessions returns all of them."""
    with tempfile.TemporaryDirectory() as tmp:
        mgr = SessionManager(Path(tmp) / "test.db")
        mgr.create_session("First")
        mgr.create_session("Second")
        sessions = mgr.list_sessions()
        assert len(sessions) == 2


def test_delete_session():
    """Delete a session and verify its nodes are also removed (cascade delete)."""
    with tempfile.TemporaryDirectory() as tmp:
        mgr = SessionManager(Path(tmp) / "test.db")
        sess = mgr.create_session()
        mgr.add_node(sess["id"], "n1", "Given", "Step 1", "$x$")
        assert mgr.delete_session(sess["id"]) is True
        assert mgr.get_session(sess["id"]) is None
        assert len(mgr.get_nodes(sess["id"])) == 0


def test_rename_session():
    """Rename a session and verify the title is updated."""
    with tempfile.TemporaryDirectory() as tmp:
        mgr = SessionManager(Path(tmp) / "test.db")
        sess = mgr.create_session("Old")
        mgr.rename_session(sess["id"], "Renamed")
        assert mgr.get_session(sess["id"])["title"] == "Renamed"


def test_full_graph():
    """Build a small graph with nodes and edges, then verify get_full_graph returns everything."""
    with tempfile.TemporaryDirectory() as tmp:
        mgr = SessionManager(Path(tmp) / "test.db")
        sess = mgr.create_session("Graph Test")
        mgr.add_node(sess["id"], "n1", "Given", "Start", "$a$")
        mgr.add_node(sess["id"], "n2", "Derivation", "Next", "$b$", parent_id="n1")
        mgr.add_edge(sess["id"], "e-n1-n2", "n1", "n2")

        graph = mgr.get_full_graph(sess["id"])
        assert graph is not None
        assert len(graph["nodes"]) == 2
        assert len(graph["edges"]) == 1
