
// 
// Copyright (c) 2024 IB Systems GmbH 
// 
// Licensed under the Apache License, Version 2.0 (the "License"); 
// you may not use this file except in compliance with the License. 
// You may obtain a copy of the License at 
// 
//    http://www.apache.org/licenses/LICENSE-2.0 
// 
// Unless required by applicable law or agreed to in writing, software 
// distributed under the License is distributed on an "AS IS" BASIS, 
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. 
// See the License for the specific language governing permissions and 
// limitations under the License. 
// 

import React, { useContext, useMemo, useState } from "react";
import { Handle, Position, useStore } from "reactflow";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { MultiSelect } from "primereact/multiselect";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import EdgeAddContext from "@/context/edge-add-context";
import "../../styles/custom-asset-node.css";

type Option = { label: string; value: string; asset_category: string };

interface CustomRelationNodeProps {
  data: { label: string; type: "relation"; parentId?: string; class?: string; asset_category?: string };
  id: string;
}

const CustomRelationNode: React.FC<CustomRelationNodeProps> = ({ data, id }) => {
  const { createAssetNodeAndEdgeFromRelation } = useContext(EdgeAddContext);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const nodes = useStore((s: any) => s.nodes);
  const edges = useStore((s: any) => s.edges);

  const unAllocated = useSelector((state: RootState) => state.unAllocatedAsset);


  const connectedBackendIds = useMemo(() => {
    const ids = new Set<string>();
    (edges ?? [])
      .filter((e: any) => e.source === id)
      .forEach((e: any) => {
        const t = (nodes ?? []).find((n: any) => n.id === e.target);
        const backendId = t?.data?.id;
        if (backendId) ids.add(backendId);
      });
    return ids;
  }, [edges, nodes, id]);





  const desiredCategory = (data?.asset_category ?? "")
    .toLowerCase()
    .replace(/\btemplate\b/gi, "")
    .trim();

  const options: Option[] = useMemo(() => {

    if (!desiredCategory) return [];

    const list = Object.values(unAllocated ?? {}) as any[];

    return list
      .map((asset: any) => {
        const rawLabel =
          asset?.product_name?.value ??
          asset?.product_name ??
          asset?.label ??
          asset?.id;

        const rawCategory =
          asset?.asset_category?.value ?? asset?.asset_category ?? "";

        // Clean versions for matching/search
        const label_clean = String(rawLabel).toLowerCase().replace(/\btemplate\b/gi, "").trim();
        const asset_category_clean = String(rawCategory).toLowerCase().replace(/\btemplate\b/gi, "").trim();

        // keep only strictly matching category (post-clean)
        if (asset_category_clean !== desiredCategory) return null;

        // exclude already-connected + parent asset
        if (connectedBackendIds.has(asset?.id)) return null;
        if (data?.parentId) {
          const parentNode = (nodes ?? []).find((n: any) => n.id === data.parentId);
          if (parentNode?.data?.id && parentNode.data.id === asset?.id) return null;
        }

        // Store both raw and clean for filtering & display
        return {
          label: rawLabel,
          value: asset?.id,
          asset_category: rawCategory,
          // extra fields used by MultiSelect's filter
          label_clean,
          asset_category_clean,
        } as Option & { label_clean: string; asset_category_clean: string };
      })
      .filter(Boolean) as Option[];
  }, [unAllocated, desiredCategory, connectedBackendIds, data?.parentId, nodes]);




  const onConfirm = () => {
    options
      .filter((o) => selected.includes(o.value))
      .forEach((o) => {
        createAssetNodeAndEdgeFromRelation(id, {
          id: o.value,
          label: o.label,
          asset_category: o.asset_category,
        });
      });

    setDialogVisible(false);
    setSelected([]);
  };

  return (
    <div className="customNode relationNode" style={{ backgroundColor: "#ead6fd", borderRadius: 16 }}>
      <Handle type="target" position={Position.Top} className="customHandle" />
      <Handle type="source" position={Position.Bottom} className="customHandle" />

      <small className="node-label">{data.label}</small>

      <Button
        icon="pi pi-plus"
        rounded
        text
        aria-label="Add target assets"
        className="global-button is-grey nodrag nopan asset-add-btn"
        tooltip="Add target assets"
        tooltipOptions={{ position: "top" }}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          setDialogVisible(true);
        }}
      />


      <Dialog header="Pick target assets" visible={dialogVisible} onHide={() => setDialogVisible(false)} style={{ width: "26rem" }} modal>
        <div className="p-field" style={{ marginTop: 8 }}>
          <MultiSelect
            value={selected}
            options={options}
            onChange={(e) => setSelected(e.value)}
            optionLabel="label"
            optionValue="value"
            placeholder={options.length ? "Select assets…" : "No compatible unallocated assets"}
            display="chip"
            className="w-full"
          />
        </div>

        <div className="flex justify-content-end gap-2" style={{ marginTop: 12 }}>
          <Button label="Cancel" text onClick={() => setDialogVisible(false)} className="global-button is-grey" />
          <Button label="Add" onClick={onConfirm} disabled={!selected.length} className="global-button" />
        </div>
      </Dialog>
    </div>
  );
};

export default CustomRelationNode;
