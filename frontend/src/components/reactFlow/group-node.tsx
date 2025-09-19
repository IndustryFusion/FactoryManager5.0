import React, { useCallback, useContext } from "react";
import { NodeResizer, NodeProps, useNodeId } from "reactflow";
import EdgeAddContext from "@/context/edge-add-context";

type GroupData = { label?: string };

const GroupNode: React.FC<NodeProps<GroupData>> = ({ selected, data }) => {
  const id = useNodeId()!;
  const { setNodes } = useContext(EdgeAddContext);


  const handleResizeEnd = useCallback(
    (_e: unknown, params: { width: number; height: number }) => {
      const { width, height } = params;
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, style: { ...n.style, width, height } } : n
        )
      );
    },
    [id, setNodes]
  );

  return (
    <div
      className="group-node"
      style={{
        width: "100%",
        height: "100%",
        background: "rgba(86,156,214,0.06)",
        border: "1.5px dashed #5a6c7d",
        borderRadius: 12,
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 6,
          left: 10,
          right: 10,
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          fontWeight: 600,
          color: "#334155",
          pointerEvents: "none",
        }}
      >
        <span>{data?.label ?? "Group"}</span>
        <span style={{ opacity: 0.6 }}>resize ↘</span>
      </div>

      <NodeResizer
        isVisible={selected}
        minWidth={220}
        minHeight={140}
        handleStyle={{ width: 10, height: 10, borderRadius: 3 }}
        onResizeEnd={handleResizeEnd}
      />
    </div>
  );
};

export default GroupNode;
