def test_imports():
    from main import app
    assert app.title == "FastAPI"
