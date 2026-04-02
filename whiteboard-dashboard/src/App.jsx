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
import { forceSimulation, forceManyBody, forceCollide, forceX, forceY, forceLink } from "d3-force";
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
      .force("charge", forceManyBody().strength(-150)) // Light repulsion
      .force("collision", forceCollide().radius(300)) // Prevent overlaps
      // --- THE FIX: Constrain to a horizontal line ---
      .force("y", forceY(window.innerHeight / 2).strength(0.8)) 
      .force("x", forceX(window.innerWidth / 2).strength(0.02))
      .velocityDecay(0.6) 
      .alpha(0.1) 
      .on("tick", () => {
        setNodes((nds) =>
          nds.map((node) => ({
            ...node,
            position: { x: node.x, y: node.y },
          }))
        );
      });
  
    return () => sim.stop();
  }, [nodes.length]);

  // 2. WebSocket Connection & Waterfall Spawning
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws/reason");
    setSocket(ws);

    ws.onmessage = (event) => {
      setIsThinking(false);
      const data = JSON.parse(event.data);
      const currentPromptId = activeIdRef.current;
      const cleanMath = data.content ? String(data.content).replace(/\\\\/g, "\\") : "";
    
      // Inside ws.onmessage
      setNodes((nds) => {
        const parentNode = nds.find((n) => String(n.id) === String(data.parent_id));
        
        // 450px to the right of the parent
        const targetX = parentNode ? parentNode.position.x + 550 : 100;
        const targetY = parentNode ? parentNode.position.y : window.innerHeight / 2;
      
        const newNode = {
          id: String(data.id),
          type: "mathNode",
          position: { x: targetX, y: targetY },
          x: targetX, // Sync D3 coordinates
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
    
      // Edge Logic (Keep 'straight' for clarity)
      if (data.parent_id) {
        setEdges((eds) => addEdge({
          id: `e-${data.parent_id}-${data.id}`,
          source: String(data.parent_id),
          target: String(data.id),
          type: "straight",
          animated: true,
          style: { stroke: "#3b82f6", strokeWidth: 3 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#3b82f6" },
          data: { promptId: currentPromptId },
        }, eds));
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
        // --- CONSTRAINTS ---
        minZoom={0.2}
        maxZoom={1.5}
        // Prevents dragging nodes/board too far away
        translateExtent={[[-1000, -1000], [5000, 5000]]} 
        fitView={false}
        fitViewOptions={{ padding: 0.2, duration: 1000, includeHiddenNodes:false }}
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
