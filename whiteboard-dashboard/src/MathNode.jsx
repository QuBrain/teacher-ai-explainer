import 'katex/dist/katex.min.css';
import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { BlockMath } from 'react-katex';


const MathNode = ({ data }) => {
  const typeStyles = {
    'Given': { border: '#94a3b8', bg: '#f8fafc' },
    'Self-Correction': { border: '#ef4444', bg: '#fef2f2' },
    'Alternative': { border: '#a855f7', bg: '#faf5ff' },
    'Derivation': { border: '#3b82f6', bg: '#eff6ff' },
    'Default': { border: '#10b981', bg: '#ffffff' }
  };

  const currentStyle = typeStyles[data.type] || typeStyles['Default'];

  return (
    <div style={{
      padding: '16px',
      borderRadius: '12px',
      border: `2px solid ${currentStyle.border}`,
      backgroundColor: currentStyle.bg,
      minWidth: '300px',
      maxWidth: '500px',
      boxShadow: '0 10px 15px rgba(0,0,0,0.1)',
      fontFamily: 'sans-serif',
      color: '#1e293b'
    }}>
      <Handle type="target" position={Position.Top} style={{ background: '#94a3b8' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', color: '#64748b' }}>{data.type}</span>
        <span style={{ fontSize: '10px', color: '#94a3b8' }}>{data.label}</span>
      </div>
      <div style={{ background: 'white', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', overflowX: 'auto' }}>
        <BlockMath math={data.math || ''} />
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: '#94a3b8' }} />
    </div>
  );
};

export default MathNode;