
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

  const desiredCategory = (data?.asset_category || "").toLowerCase().trim();

  ///later it will reomved by product_type or asset_category
  const normalize = (s: string) =>
    (s || "")
        .toLowerCase()
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const lastWord = (s: string) => {
    const parts = normalize(s).split(" ");
    return parts[parts.length - 1] || "";
    };

    const isCategoryCompatible = (assetCategory: string, relationCategory: string) => {
    const a = normalize(assetCategory);
    const r = normalize(relationCategory);
    if (!a || !r) return false;


    if (a === r) return true;


    if (lastWord(a) === r) return true;


    if (new RegExp(`\\b${r}\\b`).test(a)) return true;

    return false;
    };


  const relationTypeFallback = useMemo(() => {
    return (data?.label ?? "")
      .split("_")[0]
      .replace(/^has/i, "")
      .toLowerCase();
  }, [data?.label]);

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

const options: Option[] = useMemo(() => {
  const list = Object.values(unAllocated ?? {}) as any[];

  return list
    .map((asset: any) => {
      const label =
        asset?.product_name?.value ?? asset?.product_name ?? asset?.label ?? asset?.id;
      const asset_category =
        asset?.asset_category?.value ?? asset?.asset_category ?? "";

      let passes = true;

      if (desiredCategory) {

        passes = isCategoryCompatible(asset_category, desiredCategory);
      } else {

        if (relationTypeFallback) {
          passes = isCategoryCompatible(asset_category, relationTypeFallback);
        }
      }

      if (!passes) return null;

      if (connectedBackendIds.has(asset?.id)) return null;
      if (data?.parentId) {
        const parentNode = (nodes ?? []).find((n: any) => n.id === data.parentId);
        if (parentNode?.data?.id && parentNode.data.id === asset?.id) return null;
      }

      return { label, value: asset?.id, asset_category } as Option;
    })
    .filter(Boolean) as Option[];
}, [unAllocated, desiredCategory, relationTypeFallback, connectedBackendIds, data?.parentId, nodes]);


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

      <div className="add-relation-center nodrag nopan" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
        <Button
          icon="pi pi-plus"
          rounded
          text
          aria-label="Add target assets"
          className="add-relation-btn"
          tooltip="Add target assets"
          tooltipOptions={{ position: "top" }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setDialogVisible(true);
          }}
        />
      </div>

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
