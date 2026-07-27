// Main application component — manages the ReactFlow graph, WebSocket connection,
// tree-based layout, conversation history, and user input.
import { useEffect, useState, useRef } from "react";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  useReactFlow,
  useNodesInitialized,
  ReactFlowProvider,
  type Node,
} from "@xyflow/react";
import MathNode from "./MathNode";
import { getLayoutedElements, getGraphExtent } from "./layoutGraph";
import "@xyflow/react/dist/style.css";
import type { ReasoningNode, HistoryEntry } from "./types";

const nodeTypes = { mathNode: MathNode } as const;

function FlowBoard() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [translateExtent, setTranslateExtent] = useState<[[number, number], [number, number]]>([[-1000, -1000], [5000, 5000]]);

  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const socketRef = useRef<WebSocket | null>(null);

  const { setCenter, fitView } = useReactFlow();
  const nodesInitialized = useNodesInitialized();

  const nodeCount = nodes.length;
  const hasFinalAnswer = nodes.some((n) => (n.data as Record<string, unknown>).type === "FINAL ANSWER");
  const progressPercentage = hasFinalAnswer
    ? 100
    : Math.min((nodeCount / (nodeCount + 2)) * 100, 95);

  const handleJumpToStep = (nodeId: string) => {
    if (!nodeId) return;
    const targetNode = nodes.find((n) => n.id === nodeId);
    if (targetNode) {
      setCenter(targetNode.position.x, targetNode.position.y, { zoom: 0.8, duration: 800 });
    }
  };

  const handleProbe = useRef((nodeId: string, nodeContent: string) => {
    const ws = socketRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      setIsThinking(true);
      ws.send(JSON.stringify({ type: "probe", parent_id: nodeId, content: nodeContent }));
    }
  });

  const handleCancel = () => {
    const ws = socketRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "cancel" }));
      setIsThinking(false);
    }
  };

  const handleResend = (text: string) => {
    const ws = socketRef.current;
    if (ws?.readyState === WebSocket.OPEN && text.trim()) {
      setEditingId(null);
      setIsThinking(true);
      ws.send(text);
    }
  };

  const makeNode = (data: ReasoningNode): Node => ({
    id: String(data.id),
    type: "mathNode",
    position: { x: 0, y: 0 },
    data: {
      label: data.label,
      math: data.content || "",
      type: data.node_type,
      onProbe: (nodeId: string, nodeContent: string) => handleProbe.current(nodeId, nodeContent),
    },
  });

  // Re-layout with dagre whenever the graph changes and nodes have been measured.
  useEffect(() => {
    if (!nodesInitialized) return;
    if (nodes.length === 0) return;

    const layouted = getLayoutedElements(nodes, edges, {
      rankdir: "LR",
      nodesep: 80,
      ranksep: 200,
      edgesep: 40,
    });

    setNodes((current) =>
      current.map((n) => {
        const ln = layouted.find((l) => l.id === n.id);
        return ln ? { ...n, position: ln.position } : n;
      })
    );

    setTranslateExtent(getGraphExtent(layouted));
    fitView({ padding: 0.2, duration: 800 });
    // Only re-run when the count of nodes/edges changes, not every position update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodesInitialized, nodes.length, edges.length, setNodes, fitView]);

  useEffect(() => {
    const ws = new WebSocket("wss://professor-backend-656601378878.us-central1.run.app/ws/reason");
    socketRef.current = ws;

    ws.onmessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);

      if (data.type === "cancelled") {
        setIsThinking(false);
        return;
      }

      setIsThinking(false);

      setNodes((nds) => nds.concat(makeNode(data)));

      if (data.parent_id) {
        setEdges((eds) =>
          addEdge({
            id: `e-${data.parent_id}-${data.id}`,
            source: String(data.parent_id),
            target: String(data.id),
            type: "smoothstep",
            animated: true,
            style: { stroke: "#3b82f6", strokeWidth: 3 },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#3b82f6" },
          }, eds)
        );
      }
    };

    return () => ws.close();
  }, [setNodes, setEdges]);

  const handleSend = () => {
    const ws = socketRef.current;
    if (ws?.readyState === WebSocket.OPEN && input.trim()) {
      setHistory((prev) => [{ text: input, id: Date.now() }, ...prev]);
      setIsThinking(true);
      ws.send(input);
      setInput("");
    }
  };

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#f8fafc", overflow: "hidden" }}>

      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "6px", background: "#e2e8f0", zIndex: 10001 }}>
        <div style={{ width: `${progressPercentage}%`, height: "100%", background: "linear-gradient(90deg, #3b82f6, #10b981)", transition: "width 0.8s ease-in-out" }} />
      </div>

      <div style={{ position: "absolute", top: "12px", right: "24px", zIndex: 10002, background: "white", padding: "6px 12px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px rgba(0,0,0,0.05)", display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ fontSize: "12px", fontWeight: "bold", color: "#64748b" }}>GO TO:</span>
        <select onChange={(e) => handleJumpToStep(e.target.value)} style={{ border: "none", background: "#f1f5f9", borderRadius: "6px", padding: "4px 8px", fontSize: "12px", fontWeight: "bold", color: "#1e293b", outline: "none", cursor: "pointer" }}>
          <option value="">Step {nodeCount}</option>
          {nodes.map((node, index) => (
            <option key={node.id} value={node.id}>{index + 1}: {String((node.data as Record<string, unknown>).type || "Logic")}</option>
          ))}
        </select>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        minZoom={0.2}
        maxZoom={1.5}
        translateExtent={translateExtent}
        fitView={false}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} color="#e2e8f0" />
        <Controls />
      </ReactFlow>

      <div style={{ position: "absolute", left: "20px", top: "20px", width: "280px", maxHeight: "70vh", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(10px)", borderRadius: "16px", padding: "20px", boxShadow: "0 10px 15px rgba(0,0,0,0.1)", border: "1px solid rgba(226,232,240,0.8)", zIndex: 10000, overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ fontSize: "11px", fontWeight: "800", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>Conversation History</div>
        {history.map((item) => (
          <div key={item.id} style={{ padding: "12px", borderRadius: "8px", fontSize: "14px", background: "white", border: "1px solid #f1f5f9" }}>
            {editingId === item.id ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleResend(editText)}
                  style={{ padding: "6px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                  autoFocus
                />
                <div style={{ display: "flex", gap: "6px" }}>
                  <button onClick={() => handleResend(editText)} style={{ padding: "4px 10px", background: "#059669", color: "white", border: "none", borderRadius: "4px", fontSize: "11px", cursor: "pointer" }}>Send</button>
                  <button onClick={() => setEditingId(null)} style={{ padding: "4px 10px", background: "#e2e8f0", color: "#475569", border: "none", borderRadius: "4px", fontSize: "11px", cursor: "pointer" }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px" }}>
                <span style={{ flex: 1, cursor: "pointer" }} onClick={() => { setEditingId(item.id); setEditText(item.text); }}>
                  {item.text.substring(0, 40)}{item.text.length > 40 ? "..." : ""}
                </span>
                <button
                  onClick={() => handleResend(item.text)}
                  title="Resend"
                  style={{ background: "none", border: "none", color: "#3b82f6", cursor: "pointer", fontSize: "14px", padding: "2px" }}
                >
                  ↩
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {isThinking && (
        <div style={{ position: "absolute", bottom: "140px", left: "50%", transform: "translateX(-50%)", background: "white", padding: "12px 24px", borderRadius: "24px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 20000, display: "flex", alignItems: "center", gap: "10px" }}>
          <div className="spinner" />
          <span style={{ fontSize: "14px", fontWeight: "600", color: "#64748b" }}>Professor is thinking...</span>
          <button
            onClick={handleCancel}
            style={{ padding: "6px 14px", background: "#ef4444", color: "white", border: "none", borderRadius: "12px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}
          >
            Stop
          </button>
        </div>
      )}

      <div style={{ position: "absolute", bottom: "40px", left: "50%", transform: "translateX(-50%)", zIndex: 1000, display: "flex", gap: "12px", background: "white", padding: "20px", borderRadius: "16px", boxShadow: "0 20px 25px rgba(0,0,0,0.1)", border: "1px solid #e2e8f0" }}>
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder="Ask a STEM problem..." style={{ width: "500px", padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e1", color: "#0f172a" }} />
        <button onClick={handleSend} style={{ padding: "12px 24px", backgroundColor: "#059669", color: "white", borderRadius: "8px", border: "none", fontWeight: "bold", cursor: "pointer" }}>Teach Me</button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <FlowBoard />
    </ReactFlowProvider>
  );
}
