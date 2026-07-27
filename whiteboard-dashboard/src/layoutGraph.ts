// Layout helper using dagre for a left-to-right, non-overlapping tree.
import dagre from "dagre";
import type { Edge, Node } from "@xyflow/react";

const DEFAULT_NODE_WIDTH = 350;
const DEFAULT_NODE_HEIGHT = 200;

interface LayoutOptions {
  rankdir?: "TB" | "BT" | "LR" | "RL";
  nodesep?: number;
  ranksep?: number;
  edgesep?: number;
}

/** Compute a generous pan extent that contains all nodes plus padding. */
export function getGraphExtent(nodes: Node[]): [[number, number], [number, number]] {
  if (nodes.length === 0) {
    return [
      [-1000, -1000],
      [5000, 5000],
    ];
  }

  const padding = 1000;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    const width = node.measured?.width ?? node.width ?? DEFAULT_NODE_WIDTH;
    const height = node.measured?.height ?? node.height ?? DEFAULT_NODE_HEIGHT;
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + width);
    maxY = Math.max(maxY, node.position.y + height);
  }

  return [
    [Math.min(minX - padding, -1000), Math.min(minY - padding, -1000)],
    [Math.max(maxX + padding, 5000), Math.max(maxY + padding, 5000)],
  ];
}

/**
 * Compute collision-free positions for ReactFlow nodes using dagre.
 *
 * Falls back to sensible default dimensions for nodes that have not been
 * measured yet. After ReactFlow has rendered nodes once, callers should pass
 * `node.measured.width / height` so the layout uses true rendered sizes.
 */
export function getLayoutedElements<T extends Record<string, unknown>>(
  nodes: Node<T>[],
  edges: Edge[],
  options: LayoutOptions = {}
): Node<T>[] {
  if (nodes.length === 0) return [];

  const {
    rankdir = "LR",
    nodesep = 80,
    ranksep = 180,
    edgesep = 40,
  } = options;

  const graph = new dagre.graphlib.Graph<{ width: number; height: number }>();
  graph.setGraph({ rankdir, nodesep, ranksep, edgesep });
  graph.setDefaultEdgeLabel(() => ({}));

  for (const node of nodes) {
    const width = node.measured?.width ?? node.width ?? DEFAULT_NODE_WIDTH;
    const height = node.measured?.height ?? node.height ?? DEFAULT_NODE_HEIGHT;
    graph.setNode(node.id, { width, height });
  }

  for (const edge of edges) {
    if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
      graph.setEdge(edge.source, edge.target);
    }
  }

  dagre.layout(graph);

  return nodes.map((node) => {
    const graphNode = graph.node(node.id);
    if (!graphNode) return node;
    return {
      ...node,
      position: {
        x: graphNode.x - graphNode.width / 2,
        y: graphNode.y - graphNode.height / 2,
      },
    };
  });
}
