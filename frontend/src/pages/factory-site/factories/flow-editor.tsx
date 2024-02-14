import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactFlow, {
  addEdge,
  MiniMap,
  Controls,
  Background,
  ReactFlowProvider,
  Connection,
  useNodesState,
  useEdgesState,
  OnSelectionChangeParams,
  Node,
  Handle,
} from "reactflow";
import "reactflow/dist/style.css";
import { Button } from "primereact/button";
import { ShopFloor } from "../types/shop-floor";
import { string } from "prop-types";
import axios from "axios";
import { Toast } from "primereact/toast";
interface CustomNodeProps {
  data: FactoryNodeData;
  id: string;
}
interface AssetDetails {
  id: string;

  name?: string;
  type?: string;
}
interface FlowEditorProps {
  factory: any;
}

const initialNodes: any[] = [];
const initialEdges: any[] = [];
interface FactoryRelationships {
  hasShopFloor: {
    object: string[];
  };
}

interface FactoryNodeData {
  label: any;
}
const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;
const FlowEditor: React.FC<FlowEditorProps> = ({ factory }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedElements, setSelectedElements] = useState<any | null>(null);
  const [factoryRelationships, setFactoryRelationships] =
    useState<FactoryRelationships>({});
  const onSelectionChange = useCallback(
    (params: OnSelectionChangeParams | null) => {
      setSelectedElements(params);
    },
    []
  );

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toast = useRef<any>(null);
  const [droppedShopFloors, setDroppedShopFloors] = useState<any[]>([]);
  const [assetRelations, setAssetRelations] = useState({});

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [shopFloorAssets, setShopFloorAssets] = useState<
    Record<string, string[]>
  >({});

  const [nonShopFloorAssets, setNonShopFloorAssets] = useState({});
  useEffect(() => {
    if (factory && reactFlowInstance) {
      const factoryNodeId = `factory-${factory.id}`;
      const factoryNode: Node<FactoryNodeData> = {
        id: factoryNodeId,
        type: factory,
        position: { x: 250, y: 5 },
        data: { label: factory.factory_name },
      };

      setNodes((currentNodes) => [...currentNodes, factoryNode]);

      setFactoryRelationships((currentRelationships) => ({
        ...currentRelationships,
        [factoryNodeId]: {
          hasShopFloor: {
            object: currentRelationships[factoryNodeId]?.hasShopFloor?.object
              ? [
                  ...currentRelationships[factoryNodeId].hasShopFloor.object,
                  factoryNodeId,
                ]
              : [factoryNodeId],
          },
        },
      }));
    }
  }, [factory, reactFlowInstance, setNodes]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Delete" || event.key === "Backspace") {
        if (selectedElements) {
          setNodes((nds) => nds.filter((n) => !selectedElements.includes(n)));
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedElements, setNodes]);

  const onConnect = useCallback(
    (params) => {
      const { source, target } = params;
      setEdges((eds) => addEdge(params, eds));

      const sourceNode = nodes.find((node) => node.id === source);
      const targetNode = nodes.find((node) => node.id === target);

      if (sourceNode && targetNode) {
        if (
          sourceNode.data.type === "asset" &&
          targetNode.data.type === "relation"
        ) {
          setNodes((nds) =>
            nds.map((node) =>
              node.id === target
                ? { ...node, data: { ...node.data, parentId: source } }
                : node
            )
          );
        }

        if (
          sourceNode.data.type === "relation" &&
          targetNode.data.type === "asset"
        ) {
          const relationId = sourceNode.id;
          const parentId = sourceNode.data.parentId;
          const childAssetId = targetNode.id;
          const relationType = sourceNode.data.label;

          if (parentId) {
            // Update assetRelations state
            setAssetRelations((prev) => {
              const updatedRelations = { ...prev };
              if (!updatedRelations[parentId]) {
                updatedRelations[parentId] = {};
              }
              if (!updatedRelations[parentId][relationType]) {
                updatedRelations[parentId][relationType] = [];
              }
              updatedRelations[parentId][relationType].push(childAssetId);

              return updatedRelations;
            });
          }
        }
      }
    },
    [nodes, setNodes, setEdges, setAssetRelations]
  );

  const determineClosestShopFloor = (dropPosition) => {
    let closestShopFloorId = null;
    let minimumDistance = Infinity;

    nodes.forEach((node) => {
      if (node.data.type === "shopFloor") {
        const distance = Math.sqrt(
          Math.pow(dropPosition.x - node.position.x, 2) +
            Math.pow(dropPosition.y - node.position.y, 2)
        );

        if (distance < minimumDistance) {
          closestShopFloorId = node.id;
          minimumDistance = distance;
        }
      }
    });

    return closestShopFloorId;
  };

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (!reactFlowInstance || !reactFlowWrapper.current) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const data = event.dataTransfer.getData("application/json");

      try {
        const { item, type } = JSON.parse(data);
        console.log("Parsed item:", item, "Type:", type);
        const position = reactFlowInstance.project({
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        });

        const idPrefix = `${type}_${item.id}`;

        let label = item.id || `Unnamed ${type}  `;

        switch (type) {
          case "shopFloor":
            const shopFloorNode = {
              id: idPrefix,
              type: "custom",
              position,
              data: { label, type, id: item.id },
              style: {
                backgroundColor: "#BBE2EC",
                border: "1px solid #000000",
              },
            };

            setNodes((nds) => [...nds, shopFloorNode]);

            setDroppedShopFloors((prev) => [...prev, item.id]);

            setFactoryRelationships((prev) => {
              const updated = { ...prev };
              const factoryNodeId = `${factory.id}`;

              if (!updated[factoryNodeId]) {
                updated[factoryNodeId] = { hasShopFloor: { object: [] } };
              }

              if (
                !updated[factoryNodeId].hasShopFloor.object.includes(item.id) &&
                item.id !== factoryNodeId
              ) {
                updated[factoryNodeId].hasShopFloor.object.push(item.id);
              }

              return updated;
            });

            break;

          case "asset":
            const closestShopFloorId = determineClosestShopFloor(position);
            const factoryNodeId = `${factory.id}`;
            if (factoryNodeId) {
              const assetNode = {
                id: idPrefix,
                type: "custom",
                position,
                data: { label, type, id: item.id },
                style: {
                  backgroundColor: "#40A2E3",
                  border: "1px solid #000000",
                },
              };

              setNodes((nds) => [...nds, assetNode]);

              setShopFloorAssets((prev) => ({
                ...prev,
                [factoryNodeId]: [...(prev[factoryNodeId] || []), item.id],
              }));
            }
            break;

          case "relation":
            const newNode = {
              id: `relation_${item}_${new Date().getTime()}`,
              type: item,
              position,
              data: { label: item, type: "relation" },
              style: {
                backgroundColor: " #fdbd10",
                border: "1px solid #000000",
              },
            };
            setNodes((nds) => [...nds, newNode]);
            console.log(newNode);
            break;

          default:
            console.error("Unknown type:", type);
            break;
        }
      } catch (error) {
        console.error("Failed to parse dragged data", error);
      }
    },
    [
      reactFlowInstance,
      setNodes,
      setShopFloorAssets,
      determineClosestShopFloor,
      setDroppedShopFloors,
      setFactoryRelationships,
    ]
  );
  useEffect(() => {
    if (toastMessage) {
      toast.current.show({
        severity: toastMessage.includes("Error") ? "error" : "success",
        summary: toastMessage,
      });
      setToastMessage(null);
    }
  }, [toastMessage]);
  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onInit = useCallback((instance: any) => {
    setReactFlowInstance(instance);
  }, []);
  const handleSave = useCallback(async () => {
    const commonFactoryDetails = {
      id: factory.id,
      type: factory.type,
      factoryName: factory.factory_name,
    };

    console.log(factoryRelationships, "tes data");
    console.log(droppedShopFloors, "tes data");

    const shopFloorUpdates = droppedShopFloors.reduce((acc, shopFloorId) => {
      acc[shopFloorId] = shopFloorAssets[shopFloorId] || [];
      return acc;
    }, {});

    const updateAssetPayload = {
      ...commonFactoryDetails,
      shopFloors: shopFloorUpdates,
    };

    const updateRelationPayload = {
      ...commonFactoryDetails,
      assetRelations: assetRelations,
    };

    try {
      console.log(
        "Updating assets:",
        JSON.stringify(updateAssetPayload, null, 2)
      );

      setToastMessage("Data updated successfully");

      console.log(
        "Updating relations:",
        JSON.stringify(updateRelationPayload, null, 2)
      );

      // await axios.post(`${API_URL}/update-relation`, updateRelationPayload);

      console.log("All updates successful");
    } catch (error) {
      setToastMessage("Error updating data");
      console.error("Error updating data:", error);
    }
  }, [factory, shopFloorAssets, assetRelations]);

  return (
    <ReactFlowProvider>
      <div style={{ marginBottom: "20px" }}>
        <Button onClick={handleSave}>Save</Button>
        <Toast ref={toast} />
      </div>
      <div
        ref={reactFlowWrapper}
        style={{ height: "80vh" }}
        onDrop={onDrop}
        onDragOver={onDragOver}
      >
        <ReactFlow
          nodesDraggable={true}
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={onInit}
          onSelectionChange={onSelectionChange}
          fitView
        >
          <MiniMap />
          <Controls />
          <Background />
        </ReactFlow>
      </div>
    </ReactFlowProvider>
  );
};

export default FlowEditor;
