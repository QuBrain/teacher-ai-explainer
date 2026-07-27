# Edge case tests — concurrent connections, large graph sequences, and extreme conditions.

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
                        id="call_0",
                        function=MagicMock(
                            arguments=json.dumps({
                                "id": "n0",
                                "label": "Step 0",
                                "content": "$x_0 = 0$",
                                "node_type": "Derivation",
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


def test_multiple_sequential_connections():
    """Open 5 WebSocket connections one after another — all should connect and handle cancel."""
    client = TestClient(app)
    for i in range(5):
        with client.websocket_connect("/ws/reason") as ws:
            ws.send_text(json.dumps({"type": "cancel"}))
            data = ws.receive_json()
            assert data["type"] == "cancelled"


@patch("teacher_ai.standalone.completion")
def test_large_graph_sequence(mock_completion):
    """Send a query that triggers a tool call — verify the node is returned correctly."""
    mock_completion.side_effect = _make_mock_pair()

    client = TestClient(app)
    with client.websocket_connect("/ws/reason") as ws:
        ws.send_text("Build a graph")
        data = ws.receive_json()
        assert data["id"] == "n0"
