"""Smoke test — verifies the FastAPI apps import and initialize correctly."""

import os


def test_standalone_imports():
    """Verify the standalone app can be imported without errors."""
    from teacher_ai.standalone import app
    assert app.title == "FastAPI"


def test_legacy_imports():
    """Verify the legacy main.py app imports (skipped if GCP env vars not set)."""
    if not os.environ.get("GOOGLE_CLOUD_PROJECT") or not os.environ.get("GOOGLE_CLOUD_LOCATION"):
        return
    from main import app
    assert app.title == "FastAPI"
