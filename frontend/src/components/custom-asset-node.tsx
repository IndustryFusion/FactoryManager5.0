import React, { useEffect, useState, useContext } from "react";
import { fetchAssetById } from "@/utility/factory-site-utility";
import { MultiSelect } from "primereact/multiselect";
import { Handle, Position,useStore } from "reactflow";
import "primereact/resources/themes/saga-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import EdgeAddContext from "@/context/edge-add-context";
import { validateHeaderValue } from "http";
import "../styles/custom-asset-node.css"
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
  onEdgeAdd?: (assetId: string, relationName: string) => void;
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
  const { onEdgeAdd } = useContext(EdgeAddContext);

  useEffect(() => {
    const getAssetDetails = async () => {
      if (data.id) {
        try {
          const assetDetails= await fetchAssetById(data.id) as Record<string, AssetDetail>;

          const options: RelationOption[] = Object.entries(assetDetails)
            .filter(([key, value]) => value.type === "Relationship")
            //value.class
            .map(([key,value]) => ({
              label: key,
              value:key,
              class:value.class
              
            }));
          console.log(" options ", options)
          console.log("Formatted options for MultiSelect:", options);
          setRelationOptions(options);
          console.log(
            relationOptions,
            "The relation options list after setRelation"
          );
        } catch (error) {
          console.error("Failed to fetch asset details:", error);
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

      onEdgeAdd(data.id, relationLabel ,relationClass);

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
