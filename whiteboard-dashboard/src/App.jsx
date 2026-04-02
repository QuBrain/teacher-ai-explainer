import React, { useEffect, useState } from 'react';
import { ReactFlow, useNodesState, useEdgesState, addEdge, Background, Controls } from '@xyflow/react';
import { forceSimulation, forceManyBody, forceLink, forceCenter, forceCollide } from 'd3-force';
import MathNode from './MathNode';
import '@xyflow/react/dist/style.css';

const nodeTypes = { mathNode: MathNode };

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [socket, setSocket] = useState(null);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [history, setHistory] = useState([]);
  

  // 1. Physics Engine
  useEffect(() => {
    if (nodes.length === 0) return;
  
    const sim = forceSimulation(nodes)
      .force("charge", forceManyBody().strength(-5000))
      .force("link", forceLink(edges).id(d => d.id).distance(200))
      .force("center", forceCenter(window.innerWidth / 2, window.innerHeight / 2))
      .force("collision", forceCollide().radius(200))
      .velocityDecay(0.2) // Increased friction to stop the "shaking"
      .alpha(0.5) // Start with less "explosion" energy
      .on("tick", () => {
        setNodes((nds) => nds.map(node => ({
          ...node,
          // This ensures the node's visual position stays synced with D3 math
          position: { x: node.x, y: node.y } 
        })));
      });
  
    return () => sim.stop();
  }, [nodes.length, edges.length]);
  
  // 2. WebSocket
  // 2. WebSocket Connection
  useEffect(() => {
      const ws = new WebSocket("ws://localhost:8000/ws/reason");
      setSocket(ws);
  
      ws.onmessage = (event) => {
        setIsThinking(false);
        const data = JSON.parse(event.data);
  
        // --- PART 2 START: THE SANITIZER ---
        // This fixes the "Broken LaTeX" by cleaning up backslashes
        const cleanMath = data.content 
          ? String(data.content).replace(/\\\\/g, '\\') 
          : '';
        // --- PART 2 END ---
  
        const newNode = {
          id: data.id,
          type: "mathNode",
          // Spawning slightly off-center helps the physics "push" them apart
          position: { 
            x: window.innerWidth / 2 + (Math.random() - 1.0) * 400, 
            y: window.innerHeight / 2 + (Math.random() - 1.0) * 400 
          },
          data: {
            label: data.label,
            math: cleanMath, // Use the sanitized string here!
            type: data.node_type,
          },
        };
  
        setNodes((nds) => nds.concat(newNode));
  
        if (data.parent_id) {
          setEdges((eds) =>
            addEdge(
              {
                id: `e-${data.parent_id}-${data.id}`,
                source: data.parent_id,
                target: data.id,
                animated: true,
                style: { stroke: "#10b981", strokeWidth: 3 },
              },
              eds,
            ),
          );
        }
      };
  
      ws.onerror = (err) => console.error("WebSocket Error:", err);
      return () => ws.close();
    }, [setNodes, setEdges]);

  const handleSend = () => {
    if (socket && socket.readyState === WebSocket.OPEN && input.trim() !== "") {
      // 1. Create a message object
      const newMessage = {
        text: input,
        id: Date.now(), // Unique ID for React keys
      };
  
      // 2. Add it to our history array
      setHistory((prev) => [newMessage, ...prev]); 
  
      // 3. Send to Professor and clear
      setIsThinking(true);
      socket.send(input);
      setInput("");
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#f8fafc', overflow: 'hidden' }}>
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} fitView>
        <Background variant="dots" gap={20} color="#e2e8f0" />
        <Controls />
      </ReactFlow>
      
      {/* History Sidebar */}
      <div style={{
        position: 'absolute',
        left: '20px',
        top: '20px',
        width: '280px',
        maxHeight: '70vh',
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        border: '1px solid rgba(226, 232, 240, 0.8)',
        zIndex: 1000,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ fontSize: '12px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Conversation History
        </div>
        
        {history.length === 0 && (
          <div style={{ fontSize: '13px', color: '#cbd5e1', fontStyle: 'italic' }}>No prompts yet...</div>
        )}
      
        {history.map((item) => (
          <div key={item.id} style={{
            padding: '12px',
            background: 'white',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#1e293b',
            border: '1px solid #f1f5f9',
            lineHeight: '1.4'
          }}>
            {item.text}
          </div>
        ))}
      </div>

      {/* Thinking Indicator */}
      {isThinking && (
        <div style={{ position: 'absolute', bottom: '300px', left: '50%', transform: 'translateX(-50%)', background: 'white', padding: '10px 25px', borderRadius: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 1000, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="spinner" /> 
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#64748b' }}>Professor is thinking...</span>
        </div>
      )}

      {/* Input Overlay */}
      <div style={{ position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, display: 'flex', gap: '12px', background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 20px 25px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
        <input 
          type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask a STEM problem..."
          style={{ width: '500px', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', color: '#0f172a', backgroundColor: 'white' }}
        />
        <button onClick={handleSend} style={{ padding: '12px 24px', backgroundColor: '#059669', color: 'white', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Teach Me</button>
      </div>
    </div>
  );
}