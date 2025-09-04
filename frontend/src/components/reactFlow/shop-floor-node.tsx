import React from "react";
import { Handle, Position, NodeProps } from "reactflow";
import "../../styles/factory-flow/shop-floor.css"
type ShopFloorNodeData = {
  label: string;
  type: "shopFloor";
  kind?: string;           
};

const CustomShopFloorNode: React.FC<NodeProps<ShopFloorNodeData>> = ({ data, selected }) => {
  const pillText = data.kind || "Area";

  return (
    <div className={`shopfloor-node ${selected ? "is-selected" : ""}`}>
      <div className="sf-icon">
        <svg viewBox="0 0 24 24" className="sf-gear" aria-hidden>
          <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
          <path d="M19.4 13.5a7.6 7.6 0 0 0 .06-3l1.74-1a.5.5 0 0 0 .19-.68l-1.7-2.95a.5.5 0 0 0-.64-.2l-1.98.83a7.7 7.7 0 0 0-2.6-1.5l-.3-2.15A.5.5 0 0 0 13.6 2h-3.2a.5.5 0 0 0-.49.42l-.31 2.15a7.7 7.7 0 0 0-2.6 1.5l-1.98-.83a.5.5 0 0 0-.64.2L2.78 8.4a.5.5 0 0 0 .19.68l1.74 1a7.6 7.6 0 0 0 .06 3l-1.8 1.03a.5.5 0 0 0-.2.67l1.7 2.95a.5.5 0 0 0 .64.2l2-.84a7.7 7.7 0 0 0 2.58 1.5l.32 2.16a.5.5 0 0 0 .49.42h3.2a.5.5 0 0 0 .49-.42l.32-2.16a7.7 7.7 0 0 0 2.58-1.5l2 .84a.5.5 0 0 0 .64-.2l1.7-2.95a.5.5 0 0 0-.2-.67l-1.8-1.03Z" />
        </svg>
      </div>

      <div className="sf-titlewrap">
        <span className="sf-title">{data.label}</span>
      </div>

      <div className="sf-pill">{pillText}</div>


      <Handle id="in" type="target" position={Position.Top} className="handle-in" />
      <Handle id="out" type="source" position={Position.Bottom} className="handle-out" />
    </div>
  );
};

export default CustomShopFloorNode;
