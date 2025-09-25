import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { NodeResizer, NodeProps, useNodeId } from "reactflow";
import { InputText } from "primereact/inputtext";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import EdgeAddContext from "@/context/edge-add-context";

type GroupData = { label?: string };

const GroupNode: React.FC<NodeProps<GroupData>> = ({ selected, data }) => {
  const id = useNodeId()!;
  const { setNodes } = useContext(EdgeAddContext);

  const [showEditButton, setShowEditButton] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [tempLabel, setTempLabel] = useState(data?.label ?? "Group");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setTempLabel(data?.label ?? "Group"), [data?.label]);

  useEffect(() => {
    setShowEditButton(!!selected);
  }, [selected]);

  const commitLabel = useCallback(
    (value: string) => {
      const next = (value ?? "").trim() || "Group";
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...(n.data || {}), label: next } } : n))
      );
    },
    [id, setNodes]
  );

  const handleResizeEnd = useCallback(
    (_e: unknown, params: { width: number; height: number }) => {
      const { width, height } = params;
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, style: { ...n.style, width, height } } : n))
      );
    },
    [id, setNodes]
  );

  const onNodeDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowEditButton(true); 
  };

  const openDialog = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTempLabel(data?.label ?? "Group");
    setShowDialog(true);
  };

  const handleDialogHide = () => {
    setShowDialog(false);
  };

  const handleSave = () => {
    commitLabel(tempLabel);
    handleDialogHide();
  };

  return (
    <div
      className="group-node"
      onDoubleClick={onNodeDoubleClick}
      style={{
        width: "100%",
        height: "100%",
        background: "rgba(86,156,214,0.06)",
        border: "1.5px dashed #5a6c7d",
        borderRadius: 12,
        position: "relative",
        cursor: "grab",
        zIndex: 0,
      }}
    >
      <div
        className="subflow-drag-handle nodrag"
        style={{
          position: "absolute",
          top: 6,
          left: 10,
          right: 10,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 12,
          fontWeight: 600,
          color: "#334155",
          userSelect: "none",
          zIndex: 1,
          pointerEvents: "none",
        }}
      >
        <span
          title={data?.label ?? "Group"}
          style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "80%" }}
        >
          {data?.label ?? "Group"}
        </span>
        <span style={{ opacity: 0.6 }}>resize ↘</span>
      </div>

      {showEditButton && (
        <div
          className="nodrag move-to-room-dialog"
          style={{
            position: "absolute",
            top: -12,
            left: "50%",
            transform: "translate(-50%, -100%)",
            zIndex: 3,
            pointerEvents: "auto",
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Button
            className="p-button-text p-button-plain"
            style={{ background: "transparent", border: "none", boxShadow: "none", padding: 0 }}
            onClick={openDialog}
          >
            <img src="/factory-flow-buttons/edit-icon.svg" alt="" width="42" height="42" />
          </Button>
        </div>
      )}

      <NodeResizer
        isVisible={selected}
        minWidth={220}
        minHeight={140}
        handleStyle={{ width: 10, height: 10, borderRadius: 3 }}
        onResizeEnd={handleResizeEnd}
        handleClassName="nodrag"
        lineClassName="nodrag pe-none"
      />

      <Dialog
        header="Edit Subflow Name"
        visible={showDialog}
        draggable={false}
        modal
        onHide={handleDialogHide}
        style={{ width: "28rem" }}
      >
        <div className="flex flex-column gap-3">
          <InputText
            id="groupName"
            ref={inputRef}
            value={tempLabel}
            onChange={(e) => setTempLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") handleDialogHide();
            }}
            className="w-full mt-1"
            placeholder="Group"
            autoFocus
          />
        <div
          style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.75rem" }}
        >
          <Button
            label="Cancel"
            className="global-button is-grey"
            onClick={handleDialogHide}
          />
          <Button
            label="Save"
            onClick={handleSave}
            className="global-button"
          />
        </div>

        </div>
      </Dialog>
    </div>
  );
};

export default GroupNode;
