"""Smoke test — verifies the FastAPI app imports and initializes correctly."""

from main import app


def test_imports():
    """Verify the FastAPI application object can be imported without errors."""
    assert app.title == "FastAPI"
