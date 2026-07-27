// Shared type definitions for the reasoning graph protocol between frontend and backend

// The seven node types the AI can create
export type NodeType =
  | "Given"
  | "Objective"
  | "Principle"
  | "Derivation"
  | "Self-Correction"
  | "Alternative"
  | "Final Answer";

// A node received from the backend WebSocket
export interface ReasoningNode {
  id: string;
  label: string;
  content: string;
  node_type: NodeType;
  parent_id?: string;
}

// Message sent when the user clicks the probe (?) button on a node
export interface ProbeMessage {
  type: "probe";
  parent_id: string;
  content: string;
}

// An entry in the conversation history sidebar
export interface HistoryEntry {
  text: string;
  id: number;
}
