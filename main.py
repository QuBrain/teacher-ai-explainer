# FastAPI server that connects Gemini (Vertex AI) to a real-time whiteboard via WebSocket.
# Receives STEM questions, streams reasoning nodes back as the model generates them.

import asyncio
import json
import os

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types

app = FastAPI()

# Allow the Vite dev server and Firebase-hosted frontends to connect
origins = [
    "http://localhost:5173",
    "https://cs598-project-492002.web.app",
    "https://cs598-project-492002.firebaseapp.com"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Authenticate with Vertex AI using GCP project/location env vars
project_id = os.environ.get("GOOGLE_CLOUD_PROJECT")
location_id = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")

if project_id and location_id:
    client = genai.Client(vertexai=True, project=project_id, location=location_id)
else:
    raise ValueError("GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION must be set")

# Declare the function-calling tool that Gemini uses to add nodes to the graph
node_tool = types.Tool(
    function_declarations=[
        types.FunctionDeclaration(
            name="add_reasoning_node",
            description="Adds an atomic step of reasoning to the interactive whiteboard graph.",
            parameters=types.Schema(
                type="OBJECT",
                properties={
                    "id":        types.Schema(type="STRING"),
                    "label":     types.Schema(type="STRING"),
                    "content":   types.Schema(type="STRING", description="LaTeX math content."),
                    "node_type": types.Schema(
                        type="STRING",
                        enum=["Given", "Objective", "Principle", "Derivation",
                              "Self-Correction", "Alternative", "Final Answer"],
                    ),
                    "parent_id": types.Schema(type="STRING"),
                },
                required=["id", "label", "content", "node_type"],
            ),
        )
    ]
)


@app.get("/")
async def health():
    return {"status": "Professor is in"}


@app.websocket("/ws/reason")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    with open("System_Prompt.md", "r") as f:
        sys_inst = f.read()

    try:
        while True:
            raw = await websocket.receive_text()

            # Determine if this is a probe request (asking for alternative explanation)
            # or a regular question
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

            # Start a fresh Gemini chat session for each query
            chat = client.chats.create(
                model='gemini-2.5-pro',
                config=types.GenerateContentConfig(
                    system_instruction=sys_inst,
                    tools=[node_tool],
                    temperature=0.1
                )
            )

            response = chat.send_message(student_query)

            # Loop through Gemini's function calls, sending each node to the frontend
            # with a 1.2s delay so the graph builds incrementally
            while True:
                found_tool_call = False

                for part in response.candidates[0].content.parts:
                    if part.function_call:
                        found_tool_call = True
                        node_data = dict(part.function_call.args)

                        # Override probe responses to ensure correct structure
                        if is_probe:
                            node_data["node_type"] = "Alternative"
                            node_data["parent_id"] = parent_id

                        await asyncio.sleep(1.2)
                        await websocket.send_json(node_data)
                        print(f"Node sent: {node_data.get('label')} [{node_data.get('node_type')}]")

                        # Tell Gemini the node was rendered so it can continue
                        response = chat.send_message(
                            types.Part.from_function_response(
                                name="add_reasoning_node",
                                response={
                                    "status": "success",
                                    "message": "Node rendered on whiteboard"
                                }
                            )
                        )

                if not found_tool_call:
                    break

    except Exception as e:
        print(f"WS Error: {e}")
