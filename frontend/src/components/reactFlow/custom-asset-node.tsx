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
interface RelationOption {
  label: string;
  value: string;
  class:string
}

interface CustomAssetNodeProps {
  data: {
    id:string,
    label:string,
    type:string
  }
  createRelationNodeAndEdge?: (assetId: string, relationName: string) => void;
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

  useEffect(() => {
    const getAssetDetails = async () => {
      if (data.id) {
        try {
          const assetDetails= await getAssetRelationById(data.id) as Record<string, AssetDetail>;

          const options: RelationOption[] = Object.entries(assetDetails)
            .filter(([key, value]) => value.type === "Relationship")
            //value.class
            .map(([key,value]) => ({
              label: key,
              value:key,
              class:value.class
              
            }));
    
          setRelationOptions(options);

        } catch (error) {
          console.log("Error from getAssetRelationById  function from custom-asset-node.tsx", error);
        }
      }
    };

    getAssetDetails();
  }, [data.id]);
  const handleDropdownClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
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
      const relationOption = relationOptions.find(option => option.label === relationLabel);
      const relationClass = relationOption ? relationOption.class : '';

      createRelationNodeAndEdge(data.id, relationLabel ,relationClass);

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

  return (
    <div
      style={{
        padding: "10px",
        border: "1px none #ddd",
        borderRadius: "4px",
        backgroundColor: "#caf1d8",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        height: "100px",
      }}
      className="customNode "
    >
      
      {!isConnecting && isConnectable && (
        <Handle className="customHandle" position={Position.Bottom} type="source"  style={{ zIndex: 10 }} />
      )}
      <Handle className="customHandle" position={Position.Top} type="target" isConnectable={isConnectable}  style={{ zIndex: 10 }} />
      <small>{data.label}</small>
      <div style={{ marginTop: "10px",zIndex: 20  }} onClick={(e) => e.stopPropagation()}>
        <MultiSelect
          value={selectedRelations}
          options={relationOptions}
          onChange={handleRelationsChange}
          optionLabel="label"
          placeholder="Select Relations"
          display="chip"
          style={{ width: "100%" }}
          onClick={handleDropdownClick}
          className="w-full sm:w-10rem"
          appendTo="self" 
        />
      </div>
    </div>
  );
};

export default CustomAssetNode;
