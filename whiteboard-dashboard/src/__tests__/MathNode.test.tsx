// Tests for the MathNode custom ReactFlow component — rendering, styling, and probe button behavior.

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import MathNode, { type MathNodeType } from '../MathNode';

const mockData = {
  label: 'Step 1',
  math: '$x = 5$',
  type: 'Given',
  onProbe: () => {},
};

const mockNode: MathNodeType = {
  id: 'test-node',
  type: 'mathNode',
  position: { x: 0, y: 0 },
  data: mockData,
  selected: false,
  dragging: false,
  draggable: true,
  selectable: true,
  deletable: true,
  zIndex: 0,
};

function Wrapper({ node }: { node: MathNodeType }) {
  return (
    <ReactFlowProvider>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <MathNode {...(node as any)} />
    </ReactFlowProvider>
  );
}

describe('MathNode', () => {
  it('renders the node type badge', () => {
    render(<Wrapper node={mockNode} />);
    expect(screen.getByText('Given')).toBeInTheDocument();
  });

  it('renders the label', () => {
    render(<Wrapper node={mockNode} />);
    expect(screen.getByText('Step 1')).toBeInTheDocument();
  });

  it('renders LaTeX math content', () => {
    const { container } = render(<Wrapper node={mockNode} />);
    expect(container.textContent).toContain('x');
    expect(container.textContent).toContain('5');
  });

  it('shows probe button when onProbe is provided', () => {
    render(<Wrapper node={mockNode} />);
    expect(screen.getByTitle('Ask about this step')).toBeInTheDocument();
  });

  it('hides probe button when onProbe is undefined', () => {
    render(<Wrapper node={{ ...mockNode, data: { ...mockNode.data, onProbe: undefined } }} />);
    expect(screen.queryByTitle('Ask about this step')).not.toBeInTheDocument();
  });

  it('applies correct border color for Given type', () => {
    render(<Wrapper node={mockNode} />);
    const card = screen.getByText('Given').closest('div')?.parentElement;
    expect(card).toHaveStyle('border: 2px solid #94a3b8');
  });

  it('applies default style for unknown types', () => {
    render(<Wrapper node={{ ...mockNode, data: { ...mockNode.data, type: 'Unknown' } }} />);
    const card = screen.getByText('Unknown').closest('div')?.parentElement;
    expect(card).toHaveStyle('border: 2px solid #10b981');
  });
});
