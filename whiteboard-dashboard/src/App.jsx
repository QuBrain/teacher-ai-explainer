import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Background,
  Controls,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import { forceSimulation, forceManyBody, forceCollide, forceX, forceY } from "d3-force";
import MathNode from "./MathNode";
import "@xyflow/react/dist/style.css";

const nodeTypes = { mathNode: MathNode };

// We define the internal content separately so we can use hooks like useReactFlow
function FlowBoard() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [socket, setSocket] = useState(null);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [history, setHistory] = useState([]);
  const [activePromptId, setActivePromptId] = useState(null);
  const activeIdRef = useRef(null);

  const { setCenter } = useReactFlow();

  // Progress Calculations
  const currentNodes = nodes.filter((n) => n.data.promptId === activePromptId);
  const nodeCount = currentNodes.length;
  const progressPercentage = Math.min((nodeCount / 10) * 100, 100);

  // --- Navigation Logic ---
  const handleJumpToStep = (nodeId) => {
    if (!nodeId) return;
    const targetNode = nodes.find((n) => n.id === nodeId);
    if (targetNode) {
      setCenter(targetNode.position.x, targetNode.position.y, { zoom: 0.8, duration: 800 });
    }
  };

  const defaultEdgeOptions = {
    type: "straight",
    markerEnd: { type: MarkerType.ArrowClosed, color: "#3b82f6" },
  };

  // 1. Physics Engine
  useEffect(() => {
    if (nodes.length === 0) return;
    const sim = forceSimulation(nodes)
      .force("charge", forceManyBody().strength(-150))
      .force("collision", forceCollide().radius(300))
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
  }, [nodes.length, setNodes]);

  // 2. WebSocket Logic
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws/reason");
    setSocket(ws);
    ws.onmessage = (event) => {
      setIsThinking(false);
      const data = JSON.parse(event.data);
      const currentPromptId = activeIdRef.current;
      const cleanMath = data.content ? String(data.content).replace(/\\\\/g, "\\") : "";

      setNodes((nds) => {
        const parentNode = nds.find((n) => String(n.id) === String(data.parent_id));
        const targetX = parentNode ? parentNode.position.x + 550 : 100;
        const targetY = parentNode ? parentNode.position.y : window.innerHeight / 2;

        const newNode = {
          id: String(data.id),
          type: "mathNode",
          position: { x: targetX, y: targetY },
          x: targetX,
          y: targetY,
          data: { label: data.label, math: cleanMath, type: data.node_type, promptId: currentPromptId },
        };
        return nds.concat(newNode);
      });

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
    return () => ws.close();
  }, [setNodes, setEdges]);

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
    <div style={{ width: "100vw", height: "100vh", background: "#f8fafc", overflow: "hidden" }}>
      
      {/* Progress Bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '6px', background: '#e2e8f0', zIndex: 10001 }}>
        <div style={{ width: `${progressPercentage}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6, #10b981)', transition: 'width 0.8s ease-in-out' }} />
      </div>

      {/* NEW Dropdown HUD (Replaces static Step counter) */}
      <div style={{
        position: 'absolute', top: '12px', right: '24px', zIndex: 10002,
        background: 'white', padding: '6px 12px', borderRadius: '12px',
        border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
        display: 'flex', alignItems: 'center', gap: '10px'
      }}>
        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>GO TO:</span>
        <select 
          onChange={(e) => handleJumpToStep(e.target.value)}
          style={{
            border: 'none', background: '#f1f5f9', borderRadius: '6px',
            padding: '4px 8px', fontSize: '12px', fontWeight: 'bold', 
            color: '#1e293b', outline: 'none', cursor: 'pointer'
          }}
        >
          <option value="">Step {nodeCount}</option>
          {currentNodes.map((node, index) => (
            <option key={node.id} value={node.id}>
              {index + 1}: {node.data.type || 'Logic'}
            </option>
          ))}
        </select>
      </div>

      <ReactFlow
        nodes={currentNodes}
        edges={edges.filter((e) => e.data?.promptId === activePromptId)}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        defaultEdgeOptions={defaultEdgeOptions}
        minZoom={0.2}
        maxZoom={1.5}
        translateExtent={[[-1000, -1000], [5000, 5000]]} 
        fitView={false}
      >
        <Background variant="dots" gap={20} color="#e2e8f0" />
        <Controls />
      </ReactFlow>

      {/* History Sidebar */}
      <div style={{ position: "absolute", left: "20px", top: "20px", width: "280px", maxHeight: "70vh", background: "rgba(255, 255, 255, 0.9)", backdropFilter: "blur(10px)", borderRadius: "16px", padding: "20px", boxShadow: "0 10px 15px rgba(0, 0, 0, 0.1)", border: "1px solid rgba(226, 232, 240, 0.8)", zIndex: 10000, overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ fontSize: "11px", fontWeight: "800", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>Conversation History</div>
        {history.map((item) => (
          <div key={item.id} onClick={() => { setActivePromptId(item.id); activeIdRef.current = item.id; }} style={{ padding: "12px", borderRadius: "8px", fontSize: "14px", cursor: "pointer", background: activePromptId === item.id ? "#eff6ff" : "white", border: activePromptId === item.id ? "2px solid #3b82f6" : "1px solid #f1f5f9" }}>
            {item.text.substring(0, 40)}{item.text.length > 40 ? '...' : ''}
          </div>
        ))}
      </div>

      {/* Professor Thinking Status */}
      {isThinking && (
        <div style={{ position: "absolute", bottom: "140px", left: "50%", transform: "translateX(-50%)", background: "white", padding: "12px 24px", borderRadius: "24px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 20000, display: "flex", alignItems: "center", gap: "10px" }}>
          <div className="spinner" />
          <span style={{ fontSize: "14px", fontWeight: "600", color: "#64748b" }}>Professor is thinking...</span>
        </div>
      )}

      {/* Input Overlay */}
      <div style={{ position: "absolute", bottom: "40px", left: "50%", transform: "translateX(-50%)", zIndex: 1000, display: "flex", gap: "12px", background: "white", padding: "20px", borderRadius: "16px", boxShadow: "0 20px 25px rgba(0,0,0,0.1)", border: "1px solid #e2e8f0" }}>
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder="Ask a STEM problem..." style={{ width: "500px", padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e1", color: "#0f172a" }} />
        <button onClick={handleSend} style={{ padding: "12px 24px", backgroundColor: "#059669", color: "white", borderRadius: "8px", border: "none", fontWeight: "bold", cursor: "pointer" }}>Teach Me</button>
      </div>
    </div>
  );
}

// Wrapper to provide ReactFlow context
export default function App() {
  return (
    <ReactFlowProvider>
      <FlowBoard />
    </ReactFlowProvider>
  );
}