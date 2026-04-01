import React, { useEffect } from 'react';
import { ReactFlow, useNodesState, useEdgesState, addEdge, Background, Controls } from '@xyflow/react';
import { forceSimulation, forceManyBody, forceLink, forceCenter } from 'd3-force';
import MathNode from './MathNode';
import '@xyflow/react/dist/style.css';

const nodeTypes = { mathNode: MathNode };

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Physics Engine: Keeps the whiteboard organized
  useEffect(() => {
    if (nodes.length === 0) return;
    const sim = forceSimulation(nodes)
      .force("charge", forceManyBody().strength(-800))
      .force("link", forceLink(edges).id(d => d.id).distance(150))
      .force("center", forceCenter(window.innerWidth / 2, window.innerHeight / 2))
      .alphaMin(0.01)
      .on("tick", () => setNodes([...nodes]));
    return () => sim.stop();
  }, [nodes.length, edges.length]);

  // Connect to your FastAPI Backend
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws/reason');
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const newNode = {
        id: data.id,
        type: 'mathNode',
        position: { x: Math.random() * 100, y: Math.random() * 100 },
        data: { label: data.label, math: data.content, type: data.node_type }
      };
      setNodes((nds) => nds.concat(newNode));
      if (data.parent_id) {
        setEdges((eds) => addEdge({ id: `e-${data.parent_id}-${data.id}`, source: data.parent_id, target: data.id, animated: true }, eds));
      }
    };
    return () => ws.close();
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} fitView>
        <Background variant="dots" gap={12} size={1} />
        <Controls />
      </ReactFlow>
    </div>
  );
}