import asyncio
import json

from fastapi import FastAPI, WebSocket
from google import genai
from google.genai import types

app = FastAPI()
client = genai.Client()

# The Schema that defines our Engineering Whiteboard "Language"
node_tool = types.Tool(
    function_declarations=[
        types.FunctionDeclaration(
            name="add_reasoning_node",
            description="Adds an atomic step of reasoning to the interactive whiteboard graph.",
            parameters=types.Schema(
                type="OBJECT",
                properties={
                    "id": types.Schema(type="STRING"),
                    "label": types.Schema(type="STRING"),
                    "content": types.Schema(type="STRING", description="LaTeX math content."),
                    "node_type": types.Schema(
                        type="STRING",
                        enum=[
                            "Given", "Objective", "Principle", "Derivation", 
                            "Self-Correction", "Alternative", "Final Answer"
                        ],
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
    with open("../System_Prompt.md", "r") as f:
        sys_inst = f.read()

    try:
        while True:
            student_query = await websocket.receive_text()
            
            # 1. Initialize a fresh chat session for each query
            chat = client.chats.create(
                model='gemini-2.5-pro',
                config=types.GenerateContentConfig(
                    system_instruction=sys_inst, 
                    tools=[node_tool], 
                    temperature=0.1
                )
            )

            # 2. Send the initial query
            response = chat.send_message(student_query)

            # 3. Enter a loop to handle multiple tool calls (The "Chain")
            while True:
                # Track if any tools were called in this turn
                found_tool_call = False
                
                for part in response.candidates[0].content.parts:
                    if part.function_call:
                        found_tool_call = True
                        node_data = part.function_call.args
                        
                        # Push to React
                        await asyncio.sleep(1.2) # Better pacing for the "vibe"
                        await websocket.send_json(node_data)
                        print(f"Node sent: {node_data.get('label')}")

                        # 4. CRITICAL: Feedback to the model
                        # We send a "Success" response so it knows to move to the next step
                        response = chat.send_message(
                            types.Part.from_function_response(
                                name="add_reasoning_node",
                                response={"status": "success", "message": "Node rendered on whiteboard"}
                            )
                        )
                
                # If no more tool calls were generated, the derivation is finished
                if not found_tool_call:
                    break

    except Exception as e:
        print(f"WS Error: {e}")