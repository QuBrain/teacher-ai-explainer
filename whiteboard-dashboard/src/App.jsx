import React, { useEffect, useState, useRef } from "react";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Background,
  Controls,
  MarkerType,
} from "@xyflow/react";
import { forceSimulation, forceManyBody, forceCollide } from "d3-force";
import MathNode from "./MathNode";
import "@xyflow/react/dist/style.css";

const nodeTypes = { mathNode: MathNode };

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [socket, setSocket] = useState(null);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [history, setHistory] = useState([]);
  const [activePromptId, setActivePromptId] = useState(null);
  const activeIdRef = useRef(null);

  const defaultEdgeOptions = {
    type: "striaght",
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "#3b82f6",
    },
  };

  // 1. PHYSICS ENGINE: Low energy, high friction for sequential stability
  useEffect(() => {
    if (nodes.length === 0) return;

    const sim = forceSimulation(nodes)
      .force("charge", forceManyBody().strength(-100)) // Minimal push
      .force("collision", forceCollide().radius(250)) // Only prevent overlaps
      // REMOVE all other forces (Center, X, Y, Link)
      .velocityDecay(0.9) // Near-instant stop
      .alpha(0.1)
      .on("tick", () => {
        setNodes((nds) =>
          nds.map((node) => ({
            ...node,
            // Force the coordinates to be exactly what D3 says
            position: { x: node.x, y: node.y },
          })),
        );
      });

    return () => sim.stop();
  }, [nodes.length]); // ONLY run when nodes are added

  // 2. WebSocket Connection & Waterfall Spawning
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws/reason");
    setSocket(ws);

    ws.onmessage = (event) => {
      setIsThinking(false);
      const data = JSON.parse(event.data);
      const currentPromptId = activeIdRef.current;
      const cleanMath = data.content
        ? String(data.content).replace(/\\\\/g, "\\")
        : "";

      setNodes((nds) => {
        const parentNode = nds.find(
          (n) => String(n.id) === String(data.parent_id),
        );

        // Calculate exact coordinates
        const targetX = parentNode
          ? parentNode.position.x
          : window.innerWidth / 2;
        const targetY = parentNode ? parentNode.position.y + 350 : 100;

        const newNode = {
          id: String(data.id),
          type: "mathNode",
          // We set both 'position' and the D3 'x/y' to the same values
          position: { x: targetX, y: targetY },
          x: targetX,
          y: targetY,
          data: {
            label: data.label,
            math: cleanMath,
            type: data.node_type,
            promptId: currentPromptId,
          },
        };

        return nds.concat(newNode);
      });

      // Edge Logic
      if (data.parent_id) {
        const edge = {
          id: `e-${data.parent_id}-${data.id}`,
          source: String(data.parent_id),
          target: String(data.id),
          type: "straight", // FORCE STRAIGHT LINES
          animated: true,
          style: { stroke: "#3b82f6", strokeWidth: 3 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#3b82f6" },
          data: { promptId: currentPromptId },
        };
        setEdges((eds) => addEdge(edge, eds));
      }
    };

    ws.onerror = (err) => console.error("WebSocket Error:", err);
    return () => ws.close();
  }, [setEdges]);

  const handleSend = () => {
    if (socket?.readyState === WebSocket.OPEN && input.trim()) {
      const newId = Date.now();
      activeIdRef.current = newId;
      setHistory((prev) => [{ text: input, id: newId }, ...prev]);
      setActivePromptId(newId);
      setIsThinking(true);
      socket.send(input);
      setInput("");
    }
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#f8fafc",
        overflow: "hidden",
      }}
    >
      <ReactFlow
        nodes={nodes.filter((n) => n.data.promptId === activePromptId)}
        edges={edges.filter((e) => e.data?.promptId === activePromptId)}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
      >
        <Background variant="dots" gap={20} color="#e2e8f0" />
        <Controls />
      </ReactFlow>

      {/* History Sidebar */}
      <div
        style={{
          position: "absolute",
          left: "20px",
          top: "20px",
          width: "280px",
          maxHeight: "70vh",
          background: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(10px)",
          borderRadius: "16px",
          padding: "20px",
          boxShadow: "0 10px 15px rgba(0, 0, 0, 0.1)",
          border: "1px solid rgba(226, 232, 240, 0.8)",
          zIndex: 10000,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          pointerEvents: "all",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            fontWeight: "800",
            color: "#94a3b8",
            textTransform: "uppercase",
            letterSpacing: "1px",
          }}
        >
          Conversation History
        </div>
        {history.map((item) => (
          <div
            key={item.id}
            onClick={() => {
              setActivePromptId(item.id);
              activeIdRef.current = item.id;
            }}
            style={{
              padding: "12px",
              borderRadius: "8px",
              fontSize: "14px",
              cursor: "pointer",
              transition: "all 0.2s ease",
              background: activePromptId === item.id ? "#eff6ff" : "white",
              color: activePromptId === item.id ? "#2563eb" : "#1e293b",
              border:
                activePromptId === item.id
                  ? "2px solid #3b82f6"
                  : "1px solid #f1f5f9",
            }}
          >
            {item.text.length > 40
              ? item.text.substring(0, 40) + "..."
              : item.text}
          </div>
        ))}
      </div>

      {/* Professor Thinking Status */}
      {isThinking && (
        <div
          style={{
            position: "absolute",
            bottom: "140px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "white",
            padding: "12px 24px",
            borderRadius: "24px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            zIndex: 20000,
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <div className="spinner" />
          <span
            style={{ fontSize: "14px", fontWeight: "600", color: "#64748b" }}
          >
            Professor is thinking...
          </span>
        </div>
      )}

      {/* Input Field Overlay */}
      <div
        style={{
          position: "absolute",
          bottom: "40px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1000,
          display: "flex",
          gap: "12px",
          background: "white",
          padding: "20px",
          borderRadius: "16px",
          boxShadow: "0 20px 25px rgba(0,0,0,0.1)",
          border: "1px solid #e2e8f0",
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask a STEM problem..."
          style={{
            width: "500px",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #cbd5e1",
            color: "#0f172a",
          }}
        />
        <button
          onClick={handleSend}
          style={{
            padding: "12px 24px",
            backgroundColor: "#059669",
            color: "white",
            borderRadius: "8px",
            border: "none",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Teach Me
        </button>
      </div>
    </div>
  );
}
