
import React from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { FactoryNodeData } from "@/types/reactflow";
import "../../styles/react-flow.css";

const CustomFactoryNode: React.FC<NodeProps<FactoryNodeData>> = ({ data, selected }) => {
  return (
    <div className={`factory-node ${selected ? "is-selected" : ""}`}>
      <div className="fn-icon">
        <img
          src="/factory-flow-buttons/factory-node-icon.svg"
          alt="Factory"
          className="fn-icon-img"
          width={18}
          height={18}
        />
      </div>

      <div className="fn-titlewrap">
        <span className="fn-title">{data.label}</span>
        <img
          src="/factory-flow-buttons/factory-id.svg"
          alt="ID"
          className="fn-badge-svg"
          width={14}
          height={14}
        />
      </div>

      <div className="fn-pill">Factory Site</div>

      <Handle id="bottom" type="source" position={Position.Bottom} className="handle-out" />
    </div>
  );
};

export default CustomFactoryNode;
