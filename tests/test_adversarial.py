# Adversarial tests — security boundaries: injection, XSS, large payloads, malformed input.

import json
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from teacher_ai.standalone import app


def _make_mock_pair():
    first = MagicMock()
    first.choices = [
        MagicMock(
            message=MagicMock(
                tool_calls=[
                    MagicMock(
                        id="call_1",
                        function=MagicMock(
                            arguments=json.dumps({
                                "id": "n1",
                                "label": "Step",
                                "content": "ok",
                                "node_type": "Given",
                            })
                        ),
                    )
                ],
                model_dump=lambda: {"role": "assistant", "content": None, "tool_calls": []},
            )
        )
    ]
    second = MagicMock()
    second.choices = [
        MagicMock(
            message=MagicMock(
                tool_calls=None,
                model_dump=lambda: {"role": "assistant", "content": "done"},
            )
        )
    ]
    return first, second


@patch("teacher_ai.standalone.completion")
def test_sql_injection_in_node_content(mock_completion):
    mock_completion.side_effect = _make_mock_pair()
    client = TestClient(app)
    with client.websocket_connect("/ws/reason") as ws:
        ws.send_text(json.dumps({
            "type": "probe",
            "parent_id": "1",
            "content": "'; DROP TABLE nodes; --",
        }))
        data = ws.receive_json()
        assert data["id"] == "n1"


@patch("teacher_ai.standalone.completion")
def test_xss_injection_in_query(mock_completion):
    mock_completion.side_effect = _make_mock_pair()
    client = TestClient(app)
    with client.websocket_connect("/ws/reason") as ws:
        ws.send_text("<script>alert('xss')</script>")
        data = ws.receive_json()
        assert data["id"] == "n1"


@patch("teacher_ai.standalone.completion")
def test_large_payload(mock_completion):
    mock_completion.side_effect = _make_mock_pair()
    client = TestClient(app)
    with client.websocket_connect("/ws/reason") as ws:
        ws.send_text(json.dumps({
            "type": "probe",
            "parent_id": "1",
            "content": "A" * 100_000,
        }))
        data = ws.receive_json()
        assert data["id"] == "n1"


@patch("teacher_ai.standalone.completion")
def test_malformed_json(mock_completion):
    mock_completion.side_effect = _make_mock_pair()
    client = TestClient(app)
    with client.websocket_connect("/ws/reason") as ws:
        ws.send_text("not valid json")
        data = ws.receive_json()
        assert data["id"] == "n1"


@patch("teacher_ai.standalone.completion")
def test_empty_message(mock_completion):
    mock_completion.side_effect = _make_mock_pair()
    client = TestClient(app)
    with client.websocket_connect("/ws/reason") as ws:
        ws.send_text("")
        data = ws.receive_json()
        assert data["id"] == "n1"


@patch("teacher_ai.standalone.completion")
def test_unicode_injection(mock_completion):
    mock_completion.side_effect = _make_mock_pair()
    client = TestClient(app)
    with client.websocket_connect("/ws/reason") as ws:
        ws.send_text("\u0000\u0008\u001f\u007f")
        data = ws.receive_json()
        assert data["id"] == "n1"
