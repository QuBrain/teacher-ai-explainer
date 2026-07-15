# Teacher AI Explainer

A **nodal graph interface** for STEM tutoring powered by Google Gemini. Instead of a regular chatbot that dumps a wall of text, Gemini explains concepts by building a **visual reasoning tree** — each step of the solution is a node on an interactive graph, showing exactly how the AI got from point A to point B.

## How it works

1. A student asks a STEM question (e.g., "solve this integral")
2. Gemini receives the question with a function-calling tool that lets it add nodes to a graph
3. As Gemini reasons through the problem, it builds a tree of nodes: **Given** → **Principle** → **Derivation** → **Self-Correction** → **Final Answer**
4. The student sees the reasoning unfold in real-time on an interactive whiteboard
5. Each node is clickable — zoom in, see the LaTeX math, understand the step

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI + WebSocket + Google Gemini (Vertex AI) |
| Frontend | React + ReactFlow (node graph) + d3-force (physics layout) |
| Math rendering | KaTeX via remark-math + rehype-katex |
| Deployment | Firebase (frontend), Google Cloud Run (backend) |

## Why it's different

Most AI tutors just dump text. This one shows *how* the AI is thinking — it's like watching someone work through a problem on a whiteboard instead of just reading the final answer. The graph makes the reasoning process visible, auditable, and interactive.

## Project status

Built for CS598 (Human Computer Interaction and AI Agents) at Boston University. Works as a prototype. Future improvements could include:
- Bring-your-own-key mode
- Generalization beyond demo subjects
- Smoother visualization and animations
- Persistent knowledge maps across sessions
