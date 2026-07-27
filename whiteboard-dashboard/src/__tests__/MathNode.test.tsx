// Tests for the MathNode custom ReactFlow component — rendering, styling, and probe button behavior.

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import MathNode from '../MathNode';

const mockData = {
  label: 'Step 1',
  math: '$x = 5$',
  type: 'Given',
  onProbe: () => {},
};

function Wrapper({ data }: { data: typeof mockData }) {
  return (
    <ReactFlowProvider>
      <MathNode id="test-node" data={data} />
    </ReactFlowProvider>
  );
}

describe('MathNode', () => {
  it('renders the node type badge', () => {
    render(<Wrapper data={mockData} />);
    expect(screen.getByText('Given')).toBeInTheDocument();
  });

  it('renders the label', () => {
    render(<Wrapper data={mockData} />);
    expect(screen.getByText('Step 1')).toBeInTheDocument();
  });

  it('renders LaTeX math content', () => {
    const { container } = render(<Wrapper data={mockData} />);
    expect(container.textContent).toContain('x');
    expect(container.textContent).toContain('5');
  });

  it('shows probe button when onProbe is provided', () => {
    render(<Wrapper data={mockData} />);
    expect(screen.getByTitle('Ask about this step')).toBeInTheDocument();
  });

  it('hides probe button when onProbe is undefined', () => {
    render(<Wrapper data={{ ...mockData, onProbe: undefined }} />);
    expect(screen.queryByTitle('Ask about this step')).not.toBeInTheDocument();
  });

  it('applies correct border color for Given type', () => {
    render(<Wrapper data={mockData} />);
    const card = screen.getByText('Given').closest('div')?.parentElement;
    expect(card).toHaveStyle('border: 2px solid #94a3b8');
  });

  it('applies default style for unknown types', () => {
    render(<Wrapper data={{ ...mockData, type: 'Unknown' }} />);
    const card = screen.getByText('Unknown').closest('div')?.parentElement;
    expect(card).toHaveStyle('border: 2px solid #10b981');
  });
});
