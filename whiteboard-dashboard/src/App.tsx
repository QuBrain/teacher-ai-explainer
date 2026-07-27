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
  ReactFlowProvider,
  type Node,
} from "@xyflow/react";
import { forceSimulation, forceManyBody, forceCollide, forceX, forceY, type SimulationNodeDatum } from "d3-force";
import MathNode from "./MathNode";
import "@xyflow/react/dist/style.css";
import type { ReasoningNode, HistoryEntry } from "./types";

interface D3Node extends SimulationNodeDatum {
  id: string;
  x: number;
  y: number;
}

const nodeTypes = { mathNode: MathNode } as const;

function FlowBoard() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [activePromptId, setActivePromptId] = useState<number | null>(null);
  const activeIdRef = useRef<number | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  const { setCenter } = useReactFlow();

  const currentNodes = nodes.filter((n) => (n.data as Record<string, unknown>).promptId === activePromptId);
  const nodeCount = currentNodes.length;
  const hasFinalAnswer = currentNodes.some((n) => (n.data as Record<string, unknown>).type === "FINAL ANSWER");
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

  const makeNode = (data: ReasoningNode, position: { x: number; y: number }, promptId: number): Node => ({
    id: String(data.id),
    type: "mathNode",
    position,
    data: {
      label: data.label,
      math: data.content || "",
      type: data.node_type,
      promptId,
      onProbe: (nodeId: string, nodeContent: string) => handleProbe.current(nodeId, nodeContent),
    },
  });

  useEffect(() => {
    if (nodes.length === 0) return;
    const simNodes = nodes as unknown as D3Node[];
    const sim = forceSimulation(simNodes)
      .force("charge", forceManyBody().strength(-150))
      .force("collision", forceCollide().radius(300))
      .force("y", forceY(window.innerHeight / 2).strength(0.8))
      .force("x", forceX(window.innerWidth / 2).strength(0.02))
      .velocityDecay(0.6)
      .alpha(0.1)
      .on("tick", () => {
        setNodes((nds) =>
          nds.map((node) => ({ ...node, position: { x: (node as unknown as D3Node).x, y: (node as unknown as D3Node).y } }))
        );
      });
    return () => { sim.stop(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length, setNodes]);

  useEffect(() => {
    const ws = new WebSocket("wss://professor-backend-656601378878.us-central1.run.app/ws/reason");
    socketRef.current = ws;

    ws.onmessage = (event: MessageEvent) => {
      setIsThinking(false);
      const data: ReasoningNode = JSON.parse(event.data);
      const currentPromptId = activeIdRef.current;

      setNodes((nds) => {
        const parentNode = nds.find((n) => String(n.id) === String(data.parent_id));
        const isAlternative = data.node_type === "Alternative";
        const position = {
          x: parentNode ? parentNode.position.x + (isAlternative ? 0 : 550) : 100,
          y: parentNode ? parentNode.position.y + (isAlternative ? 220 : 0) : window.innerHeight / 2,
        };
        return nds.concat(makeNode(data, position, currentPromptId!));
      });

      if (data.parent_id) {
        setEdges((eds) =>
          addEdge({
            id: `e-${data.parent_id}-${data.id}`,
            source: String(data.parent_id),
            target: String(data.id),
            type: "straight",
            animated: true,
            style: { stroke: "#3b82f6", strokeWidth: 3 },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#3b82f6" },
            data: { promptId: activeIdRef.current },
          }, eds)
        );
      }
    };

    return () => ws.close();
  }, [setNodes, setEdges]);

  const handleSend = () => {
    const ws = socketRef.current;
    if (ws?.readyState === WebSocket.OPEN && input.trim()) {
      const newId = Date.now();
      activeIdRef.current = newId;
      setHistory((prev) => [{ text: input, id: newId }, ...prev]);
      setActivePromptId(newId);
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
          {currentNodes.map((node, index) => (
            <option key={node.id} value={node.id}>            {index + 1}: {String((node.data as Record<string, unknown>).type || "Logic")}</option>
          ))}
        </select>
      </div>

      <ReactFlow
        nodes={currentNodes}
        edges={edges.filter((e) => (e.data as Record<string, unknown>)?.promptId === activePromptId)}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        minZoom={0.2}
        maxZoom={1.5}
        translateExtent={[[-1000, -1000], [5000, 5000]]}
        fitView={false}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} color="#e2e8f0" />
        <Controls />
      </ReactFlow>

      <div style={{ position: "absolute", left: "20px", top: "20px", width: "280px", maxHeight: "70vh", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(10px)", borderRadius: "16px", padding: "20px", boxShadow: "0 10px 15px rgba(0,0,0,0.1)", border: "1px solid rgba(226,232,240,0.8)", zIndex: 10000, overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ fontSize: "11px", fontWeight: "800", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>Conversation History</div>
        {history.map((item) => (
          <div key={item.id} onClick={() => { setActivePromptId(item.id); activeIdRef.current = item.id; }} style={{ padding: "12px", borderRadius: "8px", fontSize: "14px", cursor: "pointer", background: activePromptId === item.id ? "#eff6ff" : "white", border: activePromptId === item.id ? "2px solid #3b82f6" : "1px solid #f1f5f9" }}>
            {item.text.substring(0, 40)}{item.text.length > 40 ? "..." : ""}
          </div>
        ))}
      </div>

      {isThinking && (
        <div style={{ position: "absolute", bottom: "140px", left: "50%", transform: "translateX(-50%)", background: "white", padding: "12px 24px", borderRadius: "24px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 20000, display: "flex", alignItems: "center", gap: "10px" }}>
          <div className="spinner" />
          <span style={{ fontSize: "14px", fontWeight: "600", color: "#64748b" }}>Professor is thinking...</span>
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
