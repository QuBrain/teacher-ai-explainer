"""Tests for WebSocket functionality — standalone mode LiteLLM integration.
Uses mocked LiteLLM to avoid real API calls."""

import json
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from teacher_ai.standalone import app


def test_health_endpoint():
    """Verify the health check endpoint returns the expected status."""
    client = TestClient(app)
    resp = client.get("/")
    assert resp.status_code == 200
    assert resp.json() == {"status": "Professor is in"}


def test_websocket_accepts_connection():
    """Verify the WebSocket endpoint accepts a connection without error."""
    client = TestClient(app)
    with client.websocket_connect("/ws/reason") as ws:
        assert ws


def test_websocket_receives_cancelled_on_cancel():
    """Send a cancel message and verify the server responds with cancelled confirmation."""
    client = TestClient(app)
    with client.websocket_connect("/ws/reason") as ws:
        ws.send_text(json.dumps({"type": "cancel"}))
        data = ws.receive_json()
        assert data["type"] == "cancelled"


@patch("teacher_ai.standalone.completion")
def test_websocket_sends_node_on_query(mock_completion):
    """Send a regular query and verify the server returns a reasoning node from the mocked LLM."""
    mock_response = MagicMock()
    mock_response.choices = [
        MagicMock(
            message=MagicMock(
                tool_calls=[
                    MagicMock(
                        id="call_1",
                        function=MagicMock(
                            arguments=json.dumps({
                                "id": "n1",
                                "label": "Step 1",
                                "content": "$x = 5$",
                                "node_type": "Given",
                            })
                        ),
                    )
                ],
                model_dump=lambda: {"role": "assistant", "content": None, "tool_calls": []},
            )
        )
    ]
    mock_completion.return_value = mock_response

    client = TestClient(app)
    with client.websocket_connect("/ws/reason") as ws:
        ws.send_text("Solve for x")
        data = ws.receive_json()
        assert data["id"] == "n1"
        assert data["node_type"] == "Given"


@patch("teacher_ai.standalone.completion")
def test_websocket_probe_returns_alternative(mock_completion):
    """Send a probe request and verify the server forces node_type to Alternative with correct parent_id."""
    mock_response = MagicMock()
    mock_response.choices = [
        MagicMock(
            message=MagicMock(
                tool_calls=[
                    MagicMock(
                        id="call_1",
                        function=MagicMock(
                            arguments=json.dumps({
                                "id": "n2",
                                "label": "Alt Step",
                                "content": "$y = 3$",
                                "node_type": "Alternative",
                            })
                        ),
                    )
                ],
                model_dump=lambda: {"role": "assistant", "content": None, "tool_calls": []},
            )
        )
    ]
    mock_completion.return_value = mock_response

    client = TestClient(app)
    with client.websocket_connect("/ws/reason") as ws:
        ws.send_text(json.dumps({
            "type": "probe",
            "parent_id": "n1",
            "content": "$x = 5$",
        }))
        data = ws.receive_json()
        assert data["node_type"] == "Alternative"
        assert data["parent_id"] == "n1"
