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

import React, { useEffect, useState, useContext } from "react";
import { getAssetRelationById } from "@/utility/factory-site-utility";
import { MultiSelect } from "primereact/multiselect";
import { Handle, Position,useStore } from "reactflow";
import "primereact/resources/themes/saga-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import EdgeAddContext from "@/context/edge-add-context";
import "../../styles/custom-asset-node.css"
import { Button } from "primereact/button";      
import { Dialog } from "primereact/dialog"; 
interface RelationOption {
  label: string;
  value: string;
  class:string
  asset_category?:string
}

interface CustomAssetNodeProps {
  data: {
    id:string,
    label:string,
    type:string,
    asset_category?:string,
    image_url?: string;             
    manufacturer?: string;          
  }
  createRelationNodeAndEdge?: (assetId: string, relationName: string,relationClass: string, asset_category?:string) => void;
}

interface AssetDetail {
  type: string;
  class: string;

}
interface FlowState {
    connectionNodeId: string | null;
}
const connectionNodeIdSelector = (state:FlowState) => state.connectionNodeId;

const CustomAssetNode: React.FC<CustomAssetNodeProps> = ({ data }) => {

  const connectionNodeId = useStore(connectionNodeIdSelector);
  const isConnecting = connectionNodeId != null;
  const isConnectable = connectionNodeId !== data.id;
  const [relationOptions, setRelationOptions] = useState<RelationOption[]>([]);

  const [selectedRelations, setSelectedRelations] = useState<string[]>([]);
  
  // State to track which relations have been processed
  const [processedRelations, setProcessedRelations] = useState<string[]>([]);
  const [deletedRelations, setDeletedRelations] = useState<string[]>([]);
  const { createRelationNodeAndEdge } = useContext(EdgeAddContext);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [imgErr, setImgErr] = useState(false);
  const [copied, setCopied] = useState(false);

  const shortenId = (s = "") =>
    s.length > 18 ? `${s.slice(0, 8)}…${s.slice(-12)}` : s;

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(data.id || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
   
    }
  }
  const getInitial = (s?: string) =>
    (s?.trim()?.charAt(0) || "?").toUpperCase();
  const openDialogAndFetch = async () => {
    try {
      setIsLoading(true);
      setDialogVisible(true);

      if (!data.id) return;

      const assetDetails = (await getAssetRelationById(
        data.id
      )) as any ;

      const options: RelationOption[] = Object.entries(assetDetails)
        .filter(([, value]) => value?.type === "Relationship")
        .map(([key, value]) => ({
          label: key,
          value: key,
          class: value.class,
          asset_category:value?.product_type,
          relationship_type:value?.relationship_type
        }));
      console.log("options",options)
      setRelationOptions(options);
    } catch (err) {
      setRelationOptions([]);
    } finally {
      setIsLoading(false);
    }
  };

  function getShortSerial(serial = "") {
    if (serial.length > 7) {
      return `${serial.slice(0, 3)}..${serial.slice(-4)}`;
    }
    return serial;
  }

  const handleAdd = () => {
    if (!selectedRelations.length) return;

    const toAdd = selectedRelations.filter(
      (r) => !processedRelations.includes(r)
    );

    toAdd.forEach((relationLabel) => {
      const opt = relationOptions.find(
        (o) => o.value === relationLabel || o.label === relationLabel
      );
      const relationClass = opt?.class ?? "";
      const relationName = opt?.label ?? relationLabel;
      const relationAssetCategory = opt?.asset_category ?? ""; 

      createRelationNodeAndEdge(data.id, relationName, relationClass,relationAssetCategory);
    });

   
    if (toAdd.length) {
      setProcessedRelations((prev) => [...prev, ...toAdd]);
    }

    setDialogVisible(false);
    setSelectedRelations([]);
  };
  const handleRelationsChange = (e: { value: string[] }) => {
    const currentSelectedRelations = e.value;
    const newlySelectedRelations = currentSelectedRelations.filter(
      (relation: string) =>
        !processedRelations.includes(relation) ||
        deletedRelations.includes(relation)
    );

    const newlyDeletedRelations = selectedRelations.filter(
      (relation) => !currentSelectedRelations.includes(relation)
    );

    setSelectedRelations(currentSelectedRelations);

    // Process newly selected relations
    newlySelectedRelations.forEach((relationLabel: string) => {
      const relationOption = relationOptions.find(
        option => option.label === relationLabel || option.value === relationLabel
      );
      const relationClass = relationOption?.class ?? "";  
      const relationAssetCategory = relationOption?.asset_category ?? "";
     const labelToUse = relationOption?.label ?? relationLabel;
     createRelationNodeAndEdge(data.id, labelToUse ,relationClass,relationAssetCategory,relationOption?.relationship_type);
      setProcessedRelations((prev) => [...prev, relationLabel]);
      setDeletedRelations((prev) =>
        prev.filter((rel) => rel !== relationLabel)
      );
    });

    // Handle newly deleted relations
    newlyDeletedRelations.forEach((relationLabel) => {
      setDeletedRelations((prev) => [...prev, relationLabel]);

      setProcessedRelations((prev) =>
        prev.filter((rel) => rel !== relationLabel)
      );
    });
  };
  const title = data.label ?? "Asset";
  const sub = data.asset_category ?? "";
  const vendorOrSerial = data.manufacturer || getShortSerial(data.asset_serial_number) || "";
  return (
  <div className="customNode">
    {!isConnecting && isConnectable && (
      <Handle 
        id="out"                       
        className="customHandle assetNode"
        position={Position.Bottom}
        type="source"
        data-handlepos="bottom"
        isConnectable={isConnectable}
      />
    )}
    <Handle 
      id="in"                         
      className="customHandle assetNode"
      position={Position.Top}
      type="target"
      data-handlepos="top"
      isConnectable={isConnectable}
    />
    {/* <small className="node-label-name">{data.label}</small>
    <small className="node-label-serial-number">{getShortSerial(data.asset_serial_number)}</small>
    <small className="node-label-type">{data.asset_category}</small> */}

  <div className="an-card">

    <div className="an-badge-row">
      <span className="an-pill">Asset</span>

      {data.id ? (
        <button
          type="button"
          className={`an-id-chip${copied ? " is-copied" : ""}`}
          title={copied ? "Copied!" : data.id}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            copyId();
          }}
          aria-label="Copy asset ID"
        >
          <img src="/factory-flow-buttons/id.svg" alt="" className="an-id-icon-img" draggable={false} />
          <span className="an-id-text">{shortenId(data.id)}</span>
          <img src="/factory-flow-buttons/copy-01.svg" alt="Copy ID" className="an-id-copy-img" draggable={false} />
        </button>
      ) : null}
    </div>


    <div className="an-main">
      <div className="an-thumb">
        {data.image_url && !imgErr ? (
          <img className="an-img" alt="asset" src={data.image_url} onError={() => setImgErr(true)} />
        ) : (
          <span className="an-initial">{getInitial(data.label)}</span>
        )}
      </div>

      <div className="an-body">
        <div className="an-title-row">
          <span className="an-title" title={title}>{title}</span>
        </div>
        {sub ? <div className="an-sub">{sub}</div> : null}
      </div>
    </div>
  </div>

  
      <Button
        icon="pi pi-plus"
        aria-label="Add relations"
        className="global-button is-grey nodrag nopan asset-add-btn"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          openDialogAndFetch();
        }}
      />



      <Dialog
        header="Select Relations"           
        visible={dialogVisible}             
        onHide={() => setDialogVisible(false)}
        style={{ width: "28rem" }}
        modal
        dismissableMask
      >
        <div className="p-field" style={{ marginTop: 8 }}>
          {isLoading ? (
            <div className="text-center text-gray-500 p-2">Loading…</div>
          ) : relationOptions.length ? (
           <div style={{ maxHeight: 260, overflowY: "auto" }} className="flex flex-column gap-2">
             {relationOptions.map((opt) => {
               const checked =
                  selectedRelations.includes(opt.value) || selectedRelations.includes(opt.label);
                const nextArray = checked
                  ? selectedRelations.filter(v => v !== opt.value && v !== opt.label)
                  : [...selectedRelations.filter(v => v !== opt.value && v !== opt.label), opt.value];
                return (
                  <div key={opt.value} className="flex align-items-center gap-2">
                    <input
                      type="checkbox"
                      className="custom-checkbox"
                      checked={checked}
                      onChange={() => handleRelationsChange({ value: nextArray })}
                    />
                    <span>{opt.label}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-500 p-2">No relations available</div>
          )}
        </div>

        <div className="flex justify-content-end gap-2" style={{ marginTop: 12 }}>
          <Button label="Close" onClick={() => setDialogVisible(false)} text  className="global-button is-grey"/>  
          <Button
            label="Add"
            onClick={handleAdd}
            disabled={!selectedRelations.length}
            className="global-button"
          />
        </div>
      </Dialog>
  </div>
);
};

export default CustomAssetNode;
