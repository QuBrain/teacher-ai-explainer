export type NodeType =
  | "Given"
  | "Objective"
  | "Principle"
  | "Derivation"
  | "Self-Correction"
  | "Alternative"
  | "Final Answer";

export interface ReasoningNode {
  id: string;
  label: string;
  content: string;
  node_type: NodeType;
  parent_id?: string;
}

export interface ProbeMessage {
  type: "probe";
  parent_id: string;
  content: string;
}

export interface HistoryEntry {
  text: string;
  id: number;
}
