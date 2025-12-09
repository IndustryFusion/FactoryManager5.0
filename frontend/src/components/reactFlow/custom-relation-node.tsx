
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

import React, { useContext, useMemo, useRef, useState, useEffect } from "react";
import { Handle, Position, useStore } from "reactflow";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import EdgeAddContext from "@/context/edge-add-context";
import "../../styles/custom-asset-node.css";
import { Toast } from "primereact/toast";
import { useTranslation } from "next-i18next";
import { getNonShopFloorAssetByType } from "@/utility/factory-site-utility";

type Option = {
  asset_serial_number: string; label: string; value: string; asset_category: string
};

interface CustomRelationNodeProps {
  data: { label: string; type: "relation"; parentId?: string; class?: string; asset_category?: string; asset_serial_number?: string };
  id: string;
}

const CustomRelationNode: React.FC<CustomRelationNodeProps> = ({ data, id }) => {
  const { t } = useTranslation('reactflow');
  const { createAssetNodeAndEdgeFromRelation, setNodes, setEdges } = useContext(EdgeAddContext);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const toast = useRef<Toast>(null);
  const nodes = useStore((s: any) => s.nodes ?? []);
  const edges = useStore((s: any) => s.edges ?? []);
  const unAllocated = useSelector((state: RootState) => state.unAllocatedAsset);
  const [options, setOptions] = useState<Option[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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

  const capFirst = (s?: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

  useEffect(() => {
    const fetchOptions =  async () => {
      try {
        if (!desiredCategory || !dialogVisible) return;
        setIsLoading(true);
        const list = await getNonShopFloorAssetByType(data?.asset_category || "");
        const processed = list
          .map((asset: any) => {
            const rawLabel = asset.product_name 

            const rawCategory = asset.asset_category

            const label_clean = String(rawLabel).toLowerCase().replace(/\btemplate\b/gi, "").trim();
            const asset_category_clean = String(rawCategory).toLowerCase().replace(/\btemplate\b/gi, "").trim();

            if (asset_category_clean !== desiredCategory) return null;

            if (connectedBackendIds.has(asset?.id)) return null;
            if (data?.parentId) {
              const parentNode = (nodes ?? []).find((n: any) => n.id === data.parentId);
              if (parentNode?.data?.id && parentNode.data.id === asset?.id) return null;
            }

            return {
              label: asset.product_name,
              value: asset.id,
              asset_category: asset.asset_category,
              asset_serial_number: asset.asset_serial_number,
              label_clean,
              asset_category_clean,
            } as Option & { label_clean: string; asset_category_clean: string };
          })
          .filter(Boolean) as Option[];
        setOptions(processed);
      } catch(err: any) {
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail: err.response?.data?.message ?? err.message ?? "failed to fetch unallocated asset by product type",
          life: 3000,
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchOptions();
  }, [dialogVisible]);

  const onConfirm = () => {
    if (data.class === "machine") {
      const existingEdge = edges.find((e: any) => e.source === id);
      if (existingEdge) {
        const oldTargetId = existingEdge.target;
        setNodes((prev: any[]) => prev.filter((n) => n.id !== oldTargetId));
        setEdges((prev: any[]) => prev.filter((e) => e.id !== existingEdge.id));
        toast.current?.show({
          severity: "info",
          summary: t('oldNodeRemoved'),
          detail: t('machineRelationReplaced'),
          life: 3000,
        });
      }
    }

    options
      .filter((o) => selected.includes(o.value))
      .forEach((o) => {
        createAssetNodeAndEdgeFromRelation(id, {
          id: o.value,
          label: o.label,
          asset_category: o.asset_category,
          asset_serial_number: o.asset_serial_number,
        });
      });

    setDialogVisible(false);
    setSelected([]);
  };

  const toTitle = (s?: string) => (s ?? "") .toString() .replace(/[_-]+/g, " ")     .toLowerCase() .replace(/\b\w/g, c => c.toUpperCase());

  const dialogHeader = t('selectCategory', { category: toTitle(desiredCategory) });
  return (
    <div className="customNode relationNode">
   
      <Handle id="in" type="target" position={Position.Top} className="customHandle assetNode" data-handlepos="top" />
      <Handle id="out" type="source" position={Position.Bottom} className="customHandle assetNode" data-handlepos="bottom" />



      <div className="rn-card">
        <img
          className="rn-icon"
          src="/factory-flow-buttons/is-peer-icon.svg"
          alt="Relation"
          draggable={false}
        />
        <div className="rn-text">
          <small className="node-label rn-title" title={data?.relationship_type}>
            {capFirst(data?.relationship_type)}
          </small>
          <small className="node-label rn-sub" title={data?.class}>
              {capFirst(data?.class)}
          </small>
        </div>
      </div>

      <Button
        icon="pi pi-plus"
        rounded
        text
        aria-label={t('addTargetAssets')}
        className="global-button is-grey nodrag nopan asset-add-btn"
        tooltip={t('addTargetAssets')}
        tooltipOptions={{ position: "top" }}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          setDialogVisible(true);
        }}
      />

      <Dialog
        header={dialogHeader}
        visible={dialogVisible}
        onHide={() => setDialogVisible(false)}
        style={{ width: "26rem" }}
        modal
        dismissableMask
      >
        <div className="p-field" style={{ marginTop: 8 }}>
         {
          isLoading ? (
            <div className="text-center text-gray-500 p-2">{t('reactflow:loading')}</div>
          ) :
         data.class === "machine" ? (
            options.length > 0 ? (
              <div className="flex flex-column gap-2">
                {options.map((o) => {
                  const active = selected[0] === o.value;
                  const iconSrc = active
                    ? "/button_icons/radio-active-blue.svg"
                    : "/button_icons/radio-active-grey.svg";
                  return (
                    <div
                      key={o.value}
                      className="flex align-items-center gap-2 cursor-pointer"
                      onClick={() => setSelected([o.value])}
                    >
                      <img src={iconSrc} alt="radio" width={20} height={20} />
                      <span>{o.label} ({o.asset_serial_number})</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-gray-500 mt-2">
                {t('noProductsAvailable')}
              </div>
            )
          ) : 
            options.length > 0 ? (
              <div className="flex flex-column gap-2">
                {options.map((o) => (
                  <div key={o.value} className="flex align-items-center gap-2">
                    <input
                        type="checkbox"
                        className="custom-checkbox"
                        checked={selected.includes(o.value)}
                        onChange={(e) =>
                          setSelected((prev) =>
                            e.target.checked ? [...prev, o.value] : prev.filter((v) => v !== o.value)
                          )
                        }
                      />
                    <span>{o.label} ({o.asset_serial_number})</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 mt-2">
                {t('noCompatibleUnallocatedAssets')}
              </div>
          )}
        </div>

        <div className="flex justify-content-end gap-2" style={{ marginTop: 12 }}>
          <Button label={t('cancel')} text onClick={() => setDialogVisible(false)} className="global-button is-grey" />
          <Button label={t('add')} onClick={onConfirm} disabled={!selected.length} className="global-button" />
        </div>
      </Dialog>
    </div>
  );
};

export default CustomRelationNode;
