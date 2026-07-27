# Standalone mode — FastAPI + WebSocket server that uses LiteLLM to call any LLM provider.
# The server owns the LLM call loop: user types in browser → server calls LLM → nodes stream back.
# Supports OpenAI, Anthropic, Gemini, Ollama, and 100+ providers.
# All nodes and edges are auto-saved to SQLite for session persistence.
# Supports cancel: send {"type": "cancel"} to stop the current LLM inference mid-stream.

import asyncio
import json
import os

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

os.environ["LITELLM_TELEMETRY"] = "False"

from litellm import completion

from teacher_ai.session_manager import SessionManager
from teacher_ai.settings import Settings

DEFAULT_PROVIDER = "gemini"
DEFAULT_MODEL = "gemini-2.5-pro"

app = FastAPI()

origins = [
    "http://localhost:5173",
    "https://cs598-project-492002.web.app",
    "https://cs598-project-492002.firebaseapp.com",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

tools = [
    {
        "type": "function",
        "function": {
            "name": "add_reasoning_node",
            "description": "Adds an atomic step of reasoning to the interactive whiteboard graph.",
            "parameters": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "label": {"type": "string"},
                    "content": {"type": "string", "description": "LaTeX math content."},
                    "node_type": {
                        "type": "string",
                        "enum": [
                            "Given", "Objective", "Principle", "Derivation",
                            "Self-Correction", "Alternative", "Final Answer",
                        ],
                    },
                    "parent_id": {"type": "string"},
                },
                "required": ["id", "label", "content", "node_type"],
            },
        },
    }
]

provider = os.environ.get("LLM_PROVIDER", DEFAULT_PROVIDER)
model_name = os.environ.get("MODEL_NAME", DEFAULT_MODEL)
model = f"{provider}/{model_name}"
api_key = os.environ.get("LLM_API_KEY", None)
api_base = os.environ.get("LLM_URL", None)
request_timeout = int(os.environ.get("LLM_TIMEOUT", "120"))

session_mgr = SessionManager()
settings = Settings()


@app.get("/")
async def health():
    return {"status": "Professor is in"}


@app.websocket("/ws/reason")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    with open("System_Prompt.md", "r") as f:
        sys_inst = f.read()

    sess = session_mgr.create_session(title="New Reasoning Session")
    session_id = sess["id"]
    settings.set("last_session_id", session_id)

    messages = [{"role": "system", "content": sys_inst}]
    current_task: asyncio.Task | None = None

    try:
        while True:
            raw = await websocket.receive_text()

            # Handle cancel — stop the current LLM inference
            try:
                msg = json.loads(raw)
                if msg.get("type") == "cancel":
                    if current_task and not current_task.done():
                        current_task.cancel()
                    await websocket.send_json({"type": "cancelled"})
                    continue
            except (json.JSONDecodeError, AttributeError):
                pass

            # Route: probe vs regular query
            try:
                msg = json.loads(raw)
                is_probe = msg.get("type") == "probe"
            except (json.JSONDecodeError, AttributeError):
                msg = None
                is_probe = False

            if is_probe:
                parent_id = msg["parent_id"]
                node_content = msg["content"]
                student_query = (
                    f"A student is confused about this specific step on the whiteboard:\n\n"
                    f"{node_content}\n\n"
                    f"Explain this step in a different way using a single Alternative node. "
                    f"You MUST set node_type to 'Alternative' and parent_id to '{parent_id}'. "
                    f"Do not add any other nodes."
                )
            else:
                student_query = raw

            messages.append({"role": "user", "content": student_query})

            # Run the LLM call loop in a cancellable task
            async def run_inference():
                nonlocal messages
                kwargs = dict(
                    model=model,
                    api_key=api_key,
                    messages=messages,
                    tools=tools,
                    temperature=0.1,
                    timeout=request_timeout,
                )
                if api_base:
                    kwargs["api_base"] = api_base

                response = completion(**kwargs)

                while True:
                    choice = response.choices[0]
                    message = choice.message

                    if not message.tool_calls:
                        break

                    for tool_call in message.tool_calls:
                        node_data = json.loads(tool_call.function.arguments)

                        if is_probe:
                            node_data["node_type"] = "Alternative"
                            node_data["parent_id"] = parent_id

                        session_mgr.add_node(
                            session_id=session_id,
                            node_id=str(node_data["id"]),
                            node_type=node_data["node_type"],
                            label=node_data.get("label", ""),
                            content=node_data.get("content", ""),
                            parent_id=node_data.get("parent_id"),
                        )

                        if node_data.get("parent_id"):
                            edge_id = f"e-{node_data['parent_id']}-{node_data['id']}"
                            session_mgr.add_edge(
                                session_id=session_id,
                                edge_id=edge_id,
                                source=str(node_data["parent_id"]),
                                target=str(node_data["id"]),
                            )

                        await asyncio.sleep(1.2)
                        await websocket.send_json(node_data)
                        print(f"Node sent: {node_data.get('label')} [{node_data.get('node_type')}]")

                        messages.append(message.model_dump())
                        messages.append({
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "content": json.dumps(
                                {"status": "success", "message": "Node rendered on whiteboard"}
                            ),
                        })

                        response = completion(**kwargs)

            current_task = asyncio.create_task(run_inference())
            try:
                await current_task
            except asyncio.CancelledError:
                print("Inference cancelled by user")
                await websocket.send_json({"type": "cancelled"})

    except Exception as e:
        print(f"WS Error: {e}")
