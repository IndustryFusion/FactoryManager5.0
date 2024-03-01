import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import { useHotkeys } from "react-hotkeys-hook"; // Import the hook for handling keyboard shortcuts
import ReactFlow, {
  addEdge,
  MiniMap,
  Controls,
  Background,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  OnSelectionChangeParams,
  Node,
} from "reactflow";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import "reactflow/dist/style.css";
import { Button } from "primereact/button";
import axios from "axios";
import { Toast } from "primereact/toast";
import {
  fetchAndDetermineSaveState,
  exportElementToJPEG,
  getShopFloorAndAssetData,
  extractHasRelations,
  fetchAssetById,
} from "@/utility/factory-site-utility";

import EdgeAddContext from "@/context/EdgeAddContext";
import { RelationsModal } from "@/components/reactFlowRelationModal";
import CustomAssetNode from "@/components/customAssetNode";

interface FlowEditorProps {
  factory: any;
  factoryId: string;
}

interface EdgeParams {
  source: string;
  target: string;
}

interface AssetRelations {
  [parentId: string]: {
    [relationType: string]: string[];
  };
}

interface ShopFloorAssets {
  [shopFloorId: string]: string[];
}

interface Edge {
  id: string;
  source: any;
  target: string;
}
interface RelationCounts {
  [key: string]: number;
}

interface FactoryRelationships {
  hasShopFloor: {
    object: string[];
  };
}

interface FactoryNodeData {
  label: any;
  type: any;
}
const nodeTypes = {
  asset: CustomAssetNode,
};

const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;
const FlowEditor: React.FC<FlowEditorProps> = ({ factory, factoryId }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedElements, setSelectedElements] = useState<any | null>(null);
  const [factoryRelationships, setFactoryRelationships] = useState<any>({});
  const onSelectionChange = useCallback(
    (params: OnSelectionChangeParams | null) => {
      setSelectedElements(params);
    },
    []
  );
  const [nodeUpdateTracker, setNodeUpdateTracker] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toast = useRef<any>(null);
  const [droppedShopFloors, setDroppedShopFloors] = useState<any[]>([]);
  const [assetRelations, setAssetRelations] = useState({});
  const router = useRouter();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [shopFloorAssets, setShopFloorAssets] = useState({});
  const [isSaveDisabled, setIsSaveDisabled] = useState(false);
  const elementRef = useRef(null);
  const [nodesInitialized, setNodesInitialized] = useState(false);
  const [currentNodeRelations, setCurrentNodeRelations] = useState([]);
  const [showModal, setShowModal] = useState(false);

  const [relationCounts, setRelationCounts] = useState<Record<string, number>>(
    {}
  );

  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const [selectedNodeData, setSelectedNodeData] = useState(null);

  const [selectedAsset, setSelectedAsset] = useState(null);

  const onEdgeAdd = (assetId: string, relationsInput: any) => {
    const assetNode = nodes.find((node) => node.id === selectedAsset);
    if (!assetNode) {
      console.error("Selected asset node not found");
      return;
    }
    const newCount = (relationCounts[relationsInput] || 0) + 1;
    const updatedRelationCounts = {
      ...relationCounts,
      [relationsInput]: newCount,
    };
    setRelationCounts(updatedRelationCounts);

    const relations = Array.isArray(relationsInput)
      ? relationsInput
      : [relationsInput];

    let existingRelationsCount = nodes.filter(
      (node) =>
        node.data.type === "relation" && node.data.parentId === selectedAsset
    ).length;
    let baseXOffset = 200 + existingRelationsCount * 200; // Increment starting x position based on existing relations

    relations.forEach((relationName, index) => {
      const xOffset = index + 10; // Horizontal spacing between each relation node

      const relationNodeId = `relation-${relationName}_${String(
        newCount
      ).padStart(3, "0")}`;
      const newRelationNode = {
        id: relationNodeId,
        style: {
          backgroundColor: "#ead6fd",
          border: "none",
          borderRadius: "45%",
        },
        data: {
          label: `${relationName}_${String(newCount).padStart(3, "0")}`,
          type: "relation",
          parentId: selectedAsset,
        },
        position: {
          x: assetNode.position.x + baseXOffset + xOffset, // calculated x offset
          y: assetNode.position.y + 200, // Fixed vertical offset
        },
      };

      const newEdge: any = {
        id: `reactflow_edge-${selectedAsset}-${relationNodeId}`,
        source: selectedAsset,
        target: relationNodeId,
      };

      // Update state with new node and edge
      setNodes((prevNodes) => [...prevNodes, newRelationNode]);
      setEdges((prevEdges) => addEdge(newEdge, prevEdges));
      console.log(edges, "edges value");
    });
    [nodes, edges, relationCounts];
  };

  useEffect(() => {
    if (factory && reactFlowInstance) {
      const factoryNodeId = `factory-${factory.id}`;
      const factoryNode: Node<FactoryNodeData> = {
        id: factoryNodeId,
        type: factory,
        position: { x: 250, y: 70 },
        data: { label: factory.factory_name, type: `factory` },
      };

      setNodes((currentNodes) => [...currentNodes, factoryNode]);
      setNodeUpdateTracker((prev) => prev + 1);
      setFactoryRelationships((currentRelationships: any) => ({
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
      setNodesInitialized(true);
    }
  }, [factory, reactFlowInstance, setNodes]);

  useEffect(() => {
    if (nodesInitialized) {
      const fetchDataAndDetermineSaveState = async () => {
        await fetchAndDetermineSaveState(
          factoryId,
          nodes,
          setIsSaveDisabled,
          API_URL
        );
      };

      fetchDataAndDetermineSaveState().catch(console.error);
    }
  }, [nodes, nodesInitialized, factoryId, API_URL]);

  const onRestore = useCallback(async () => {
    if (factoryId) {
      try {
        const response = await axios.get(`${API_URL}/react-flow/${factoryId}`, {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          withCredentials: true,
        });
        console.log(response.data, " the backend data flowChart");
        if (
          response.data &&
          response.data.factoryData.nodes &&
          response.data.factoryData.edges
        ) {
          setNodes(response.data.factoryData.nodes);
          setEdges(response.data.factoryData.edges);
          nodes.forEach((node) => {
            if (node.type === "shopFloor") {
              // If the node is a shopFloor, add it to the shopFloorAssets list
              shopFloorAssets!.push(node);
            } else if (node.type === "asset") {
              // If the node is an asset, check if it has any incoming edges
              const incomingEdges = edges.filter(
                (edge) => edge.target === node.id
              );
            }
          });
        } else {
          console.log("Invalid data received from backend");
        }
      } catch (error) {
        console.error("Error fetching flowchart data:", error);
      }
    }
  }, [setNodes, setEdges, factoryId]);

  useEffect(() => {
    onRestore();
  }, [onRestore]);

  const onUpdate = useCallback(async () => {
    const payLoad = {
      factoryId: factoryId,

      factoryData: {
        nodes: nodes.map(({ id, type, position, data, style }) => ({
          id,
          type,
          position,
          data,
          style,
        })),
        edges: edges.map(({ id, source, target, type, data }) => ({
          id,
          source,
          target,
          type,
          data,
        })),
      },
    };
    console.log(payLoad, "kkkkkkkkkk");
    try {
      const response = await axios.patch(
        `${API_URL}/react-flow/${factoryId}`,
        payLoad,
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          withCredentials: true,
          params: { id: factoryId },
        }
      );

      if (response.data.success) {
        setToastMessage("Flowchart Updated successfully");
      } else {
        setToastMessage(response.data.message);
      }
    } catch (error) {
      console.error("Error saving flowchart:", error);
      setToastMessage("Error saving flowchart");
    }
  }, [nodes, edges, factoryId]);

  const onSave = useCallback(async () => {
    const payLoad = {
      factoryId: factoryId,

      factoryData: {
        nodes: nodes.map(({ id, type, position, data, style }) => ({
          id,
          type,
          position,
          data,
          style,
        })),
        edges: edges.map(({ id, source, target, type, data }) => ({
          id,
          source,
          target,
          type,
          data,
        })),
      },
    };

    try {
      const response = await axios.post(`${API_URL}/react-flow`, payLoad, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        withCredentials: true,
      });

      if (response.data.success) {
        setToastMessage("Flowchart saved successfully");
      } else {
        setToastMessage(response.data.message);
      }
    } catch (error) {
      console.error("Error saving flowchart:", error);
      setToastMessage("Error saving flowchart");
    }
  }, [nodes, edges, factoryId]);

  const handleExportClick = () => {
    if (elementRef.current) {
      exportElementToJPEG(elementRef.current, "myElement.jpeg");
    }
  };

  const onElementClick = useCallback((event: any, element: any) => {
    if (element.type === "asset") {
      // Fetch asset details and set relations
      fetchAssetById(element.data.id)
        .then((relations: any) => {
          setCurrentNodeRelations(relations);
          setSelectedAsset(element.id); // Set the selected asset
          setSelectedNodeData(element.data);
          setShowModal(true); // Show the modal
          setModalPosition({ x: event.clientX, y: event.clientY }); // Set modal position
        })
        .catch((error) =>
          console.error("Error fetching asset details:", error)
        );
    }
  }, []);

  const onConnect = useCallback(
    (params: any) => {
      const { source, target } = params;
      const sourceNode: any = nodes.find((node) => node.id === source);
      const targetNode: any = nodes.find((node) => node.id === target);

      if (!sourceNode || !targetNode) return;
      // Check if the source node is a relation and it already has an outgoing connection
      if (sourceNode.data.type === "relation") {
        const alreadyHasChild = edges.some((edge) => edge.source === source);

        if (alreadyHasChild) {
          toast.current.show({
            severity: "warn",
            summary: "Operation not allowed",
            detail: "A relation can only have one child node.",
          });
          return;
        }
      }
      if (
        sourceNode.data.type === "shopFloor" &&
        targetNode.data.type === "asset"
      ) {
        setShopFloorAssets((prevAssets) => {
          const updatedAssets: any = { ...prevAssets };
          const assets = updatedAssets[sourceNode.id] || [];
          updatedAssets[sourceNode.id] = [...assets, targetNode.id];
          return updatedAssets;
        });
        setEdges((prevEdges) => addEdge(params, prevEdges)); // Add edge
      } else if (
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
        setEdges((prevEdges) => addEdge(params, prevEdges)); // Add edge
      } else if (
        sourceNode.data.type === "relation" &&
        targetNode.data.type === "asset"
      ) {
        const parentId = sourceNode.data.parentId;
        const childAssetId = targetNode.id;

        const newRelationNodeId = `${sourceNode.id}_${childAssetId}`;

        // Update the relation node ID with the new ID
        const updatedNodes = nodes.map((node) => {
          if (node.id === sourceNode.id) {
            return { ...node, id: newRelationNodeId };
          }
          return node;
        });

        // Update the edges with the new source node ID for any edge connected to the updated relation node
        const updatedEdges = edges.map((edge) => {
          if (edge.source === sourceNode.id) {
            return { ...edge, source: newRelationNodeId };
          } else if (edge.target === sourceNode.id) {
            return { ...edge, target: newRelationNodeId };
          }
          return edge;
        });

        // Add a new edge for the current connection
        const newEdge = {
          id: `reactflow_edge-${newRelationNodeId}`,
          source: newRelationNodeId,
          target: childAssetId,
          animated: true,
        };

        setNodes(updatedNodes);
        setEdges([...updatedEdges, newEdge]);

        console.log("Updated Edges:", [...updatedEdges, newEdge]);
      } else if (
        sourceNode.data.type === "factory" &&
        targetNode.data.type === "shopFloor"
      ) {
        setEdges((prevEdges) => addEdge(params, prevEdges)); // Add edge
      } else {
        if (toast) {
          toast.current.show({
            severity: "error",
            summary: "Connection not allowed",
            detail: "Invalid connection type.",
          });
        }
      }
    },
    [nodes, setNodes, setAssetRelations, setShopFloorAssets, setEdges, toast]
  );

  const determineClosestShopFloor = (dropPosition: any) => {
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
  const handleBackspacePress = useCallback(() => {
    if (
      selectedElements?.nodes?.length > 0 ||
      selectedElements?.edges?.length > 0
    ) {
      const nodeIdsToDelete = new Set(
        selectedElements.nodes?.map((node: any) => node.id)
      );
      const edgeIdsToDelete = new Set(
        selectedElements.edges?.map((edge: any) => edge.id)
      );

      // Collect edges that should be deleted due to node deletion
      const connectedEdgeIdsToDelete = new Set();
      edges.forEach((edge) => {
        if (
          nodeIdsToDelete.has(edge.source) ||
          nodeIdsToDelete.has(edge.target)
        ) {
          connectedEdgeIdsToDelete.add(edge.id);
        }
      });

      // Prepare to track updates to relation node IDs
      let newNodes = [...nodes];
      let relationNodeUpdates = new Map();

      // Check each edge for deletion to see if it affects a relation node
      connectedEdgeIdsToDelete.forEach((edgeId) => {
        const edgeToDelete = edges.find((edge) => edge.id === edgeId);
        if (edgeToDelete) {
          // Focus on updating relation node if it's the target of the deleted edge
          const targetNode = newNodes.find(
            (node) => node.id === edgeToDelete.source
          );
          if (targetNode && targetNode.data.type === "relation") {
            //  the relation node's ID by removing asset-specific identifier
            const newId = targetNode.id.split("_asset")[0]; // removes everything after "_asset"
            relationNodeUpdates.set(targetNode.id, newId);
            targetNode.id = newId; // update ID in newNodes
          }
        }
      });

      // Remove deleted nodes and update edges to reflect any ID changes
      newNodes = newNodes.filter((node) => !nodeIdsToDelete.has(node.id));
      const newEdges = edges
        .filter((edge) => !connectedEdgeIdsToDelete.has(edge.id))
        .map((edge) => {
          // Adjust source - target IDs based on earlier updates
          edge.source = relationNodeUpdates.get(edge.source) || edge.source;
          edge.target = relationNodeUpdates.get(edge.target) || edge.target;
          return edge;
        });

      setNodes(newNodes);
      setEdges(newEdges);

      // Clear the selection to prevent errors
      setSelectedElements(null);
    }
  }, [selectedElements, nodes, edges, setNodes, setEdges, setSelectedElements]);

  useEffect(() => {
    document.addEventListener("keydown", handleBackspacePress);

    return () => {
      document.removeEventListener("keydown", handleBackspacePress);
    };
  }, [handleBackspacePress]);

  useHotkeys("backspace", handleBackspacePress);

  const onNodeDoubleClick = useCallback(
    (event: any, node: any) => {
      console.log(node, "JKB");
      if (node.type === "shopFloor") {
        router.push("/factory-site/dashboard");
      }
    },
    [router]
  );

  const handleDelete = async () => {
    try {
      const response = await axios.delete(
        `${API_URL}/react-flow/${factoryId}`,
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          withCredentials: true,
        }
      );

      setToastMessage("Selected elements deleted successfully.");
      setIsSaveDisabled(false);
    } catch (error) {
      console.error("Error deleting elements:", error);
      setToastMessage("Error deleting elements.");
    }
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

        let label = item.product_name || item.floorName || `Unnamed ${type}`;

        switch (type) {
          case "shopFloor":
            const shopFloorNode = {
              id: idPrefix,
              type: "shopFloor",
              position,
              style: {
                backgroundColor: "#faedc4",
                border: "none",
              },
              data: {
                type: type,
                label,
                id: item.id,
                onNodeDoubleClick,
              },
            };

            setNodes((nds) => [...nds, shopFloorNode]);

            setDroppedShopFloors((prev) => [...prev, item.id]);

            setFactoryRelationships((prev: any) => {
              const updated: any = { ...prev };
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
            const factoryNodeId = `${factory.id}`;
            setSelectedNodeData(item);

            if (factoryNodeId) {
              const assetNode = {
                id: idPrefix + `_${new Date().getTime()}`,
                type: "asset",

                position,
                data: {
                  type: type,
                  label,

                  id: item.id,
                },

                style: {
                  backgroundColor: "#caf1d8",
                  border: "none",
                },
              };

              setNodes((nds) => [...nds, assetNode]);

              setShopFloorAssets((prev: any) => ({
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
                backgroundColor: "#ead6fd",
                border: "none",
                borderRadius: "45%",
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
        severity: toastMessage.includes("Error")
          ? "error"
          : toastMessage.includes("Warning")
          ? "warn"
          : "success",
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
  const handleCloseModal = () => {
    setShowModal(false);
  };
  const handleUpdate = useCallback(async () => {
    onUpdate();
  }, [factoryId, nodes, edges, shopFloorAssets, assetRelations]);

  const handleSave = useCallback(async () => {
    onSave();
  }, [
    factory,
    shopFloorAssets,
    assetRelations,
    droppedShopFloors,
    edges,
    nodes,
  ]);

  return (
    <ReactFlowProvider>
      <EdgeAddContext.Provider value={{ onEdgeAdd }}>
        {" "}
        <div style={{}}>
          <Button
            label="Save"
            onClick={handleSave}
            className="m-2"
            raised
            disabled={isSaveDisabled}
          />

          <Button
            label="Undo"
            onClick={onRestore}
            className="p-button-secondary m-2"
            raised
          />
          <Button
            label="Update"
            onClick={handleUpdate}
            className="p-button-success m-2"
            raised
          />

          <Button
            label="Delete"
            onClick={handleDelete}
            className="p-button-danger m-2"
            raised
          />

          <Button
            label="Export as JPEG"
            className="m-2"
            onClick={handleExportClick}
          />

          <Toast ref={toast} />
        </div>
        <div
          ref={reactFlowWrapper}
          style={{ height: "95%", width: "100%" }}
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
            onInit={setReactFlowInstance}
            onNodeDoubleClick={onNodeDoubleClick}
            onSelectionChange={onSelectionChange}
            fitView
            ref={elementRef}
            onNodeClick={onElementClick}
            nodeTypes={nodeTypes}
          >
            <MiniMap />
            <Controls />
            <Background />
          </ReactFlow>
        </div>
      </EdgeAddContext.Provider>
    </ReactFlowProvider>
  );
};

export default FlowEditor;
