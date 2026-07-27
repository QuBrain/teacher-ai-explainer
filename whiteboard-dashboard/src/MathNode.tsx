import "katex/dist/katex.min.css";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

export interface MathNodeData {
  label: string;
  math: string;
  type: string;
  promptId: number;
  onProbe?: (id: string, math: string) => void;
  [key: string]: unknown;
}

export type MathNodeType = Node<MathNodeData, "mathNode">;

const typeStyles: Record<string, { border: string; bg: string }> = {
  "Given": { border: "#94a3b8", bg: "#f8fafc" },
  "Self-Correction": { border: "#ef4444", bg: "#fef2f2" },
  "Alternative": { border: "#a855f7", bg: "#faf5ff" },
  "Derivation": { border: "#3b82f6", bg: "#eff6ff" },
};

const MathNode = ({ id, data }: NodeProps<MathNodeType>) => {
  const currentStyle = typeStyles[data.type] || { border: "#10b981", bg: "#ffffff" };

  return (
    <div style={{
      padding: "16px",
      borderRadius: "12px",
      border: `2px solid ${currentStyle.border}`,
      backgroundColor: currentStyle.bg,
      minWidth: "300px",
      maxWidth: "500px",
      boxShadow: "0 10px 15px rgba(0,0,0,0.1)",
      fontFamily: "sans-serif",
      color: "#1e293b",
      position: "relative",
    }}>
      <Handle type="target" position={Position.Left} style={{ background: "#94a3b8" }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <span style={{ fontSize: "10px", fontWeight: "900", textTransform: "uppercase", color: "#64748b" }}>
          {data.type}
        </span>
        <span style={{ fontSize: "10px", color: "#94a3b8" }}>{data.label}</span>
      </div>

      <div style={{ background: "white", padding: "12px", borderRadius: "6px", border: "1px solid #e2e8f0", overflowX: "auto" }}>
        <ReactMarkdown
          remarkPlugins={[remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
            p: (props) => (
              <p style={{ margin: 0, fontSize: "14px", lineHeight: "1.5", color: "#1e293b" }} {...props} />
            ),
          }}
        >
          {data.math}
        </ReactMarkdown>
      </div>

      {data.onProbe && (
        <button
          onClick={() => data.onProbe!(id, data.math)}
          title="Ask about this step"
          style={{
            position: "absolute",
            bottom: "-14px",
            right: "12px",
            width: "28px",
            height: "28px",
            borderRadius: "50%",
            background: "#ef4444",
            color: "white",
            border: "none",
            fontWeight: "900",
            fontSize: "14px",
            cursor: "pointer",
            boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ?
        </button>
      )}

      <Handle type="source" position={Position.Right} style={{ background: "#94a3b8" }} />
    </div>
  );
};

export default MathNode;
