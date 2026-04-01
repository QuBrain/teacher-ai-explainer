import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

const MathNode = ({ data }) => {
  // Color code based on your System Prompt logic
  const typeColors = {
    'Given': 'border-gray-400 bg-gray-50',
    'Self-Correction': 'border-red-500 bg-red-50',
    'Alternative': 'border-purple-500 bg-purple-50',
    'Derivation': 'border-blue-500 bg-blue-50'
  };

  const style = typeColors[data.type] || 'border-emerald-500 bg-white';

  return (
    <div className={`p-3 shadow-xl rounded-md border-2 min-w-[150px] ${style}`}>
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-gray-400" />
      <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">{data.type}</div>
      <div className="font-semibold text-xs mb-2">{data.label}</div>
      <div className="bg-white p-2 rounded border border-gray-100">
        <BlockMath math={data.math} />
      </div>
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-gray-400" />
    </div>
  );
};

export default MathNode;