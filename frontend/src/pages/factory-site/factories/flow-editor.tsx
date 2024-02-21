import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import { useHotkeys } from "react-hotkeys-hook"; // Import the hook for handling keyboard shortcuts
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
  Edge,
} from "reactflow";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import "reactflow/dist/style.css";
import { Button } from "primereact/button";
import { ShopFloor } from "../types/shop-floor";
import { string } from "prop-types";
import axios from "axios";
import { Toast } from "primereact/toast";
import {
  getshopFloorById,
  fetchAndDetermineSaveState,
  exportElementToJPEG,
  getShopFloorAndAssetData,
  extractHasRelations,
} from "@/utility/factory-site-utility";
import ShopFloorList from "@/components/ShopFloorList";
interface FlowEditorProps {
  factory: any;
  factoryId: string;
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
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toast = useRef<any>(null);
  const [droppedShopFloors, setDroppedShopFloors] = useState<any[]>([]);
  const [assetRelations, setAssetRelations] = useState({});
  const router = useRouter();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [shopFloorAssets, setShopFloorAssets] = useState<any>({});
  const [isSaveDisabled, setIsSaveDisabled] = useState(false);
  const elementRef = useRef(null);
  const [nodesInitialized, setNodesInitialized] = useState(false);
  const [shopFloorID, setShopFloorID] = useState("");
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
          console.log("ShopFloor Assets:", shopFloorAssets);
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

  const onSave = useCallback(async () => {
    // Extracting shop floor IDs connected to the factory
    const connectedShopFloors = nodes
      .filter((node) => node.data.type === "shopFloor")
      .map((node) => node.data.id);

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
        shopFloor: connectedShopFloors,
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

  const onElementClick = (event: any, element: any) => {
    console.log("Clicked element:", element);
    // If you only want to log node details (and not edges), you can check the element's type
    if (element.type !== "customEdge") {
      // Assuming 'customEdge' is your edge type
      console.log("Clicked node details:", element);
    }
  };

  const onConnect = useCallback(
    (params: any) => {
      const { source, target } = params;
      const sourceNode: any = nodes.find((node) => node.id === source);
      const targetNode: any = nodes.find((node) => node.id === target);

      if (!sourceNode || !targetNode) return;

      if (
        sourceNode.data.type === "shopFloor" &&
        targetNode.data.type === "asset"
      ) {
        setShopFloorAssets((prevAssets) => {
          const updatedAssets:any = { ...prevAssets };
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
        const relationType = sourceNode.data.label;

        if (parentId) {
          setAssetRelations((prev) => {
            const updatedRelations: any = { ...prev };
            if (!updatedRelations[parentId]) {
              updatedRelations[parentId] = {};
            }
            if (!updatedRelations[parentId][relationType]) {
              updatedRelations[parentId][relationType] = [];
            }
            updatedRelations[parentId][relationType].push(childAssetId);
            return updatedRelations;
          });
          setEdges((prevEdges) => addEdge(params, prevEdges)); // Add edge
        }
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
        selectedElements.nodes.map((node: { id: any; }) => node.id)
      );
      const edgeIdsToDelete = new Set(
        selectedElements.edges.map((edge: { id: any; }) => edge.id)
      );

      // Filter nodes and edges to remove selected ones
      const newNodes = nodes.filter((node) => !nodeIdsToDelete.has(node.id));
      const newEdges = edges.filter((edge) => !edgeIdsToDelete.has(edge.id));

      // Update shopFloorAssets based on the remaining nodes
      const newShopFloorAssets:any = { ...shopFloorAssets };
      Object.keys(newShopFloorAssets).forEach((key) => {
        newShopFloorAssets[key] = newShopFloorAssets[key].filter(
          (assetId: unknown) => !nodeIdsToDelete.has(assetId)
        );
        if (newShopFloorAssets[key].length === 0) {
          delete newShopFloorAssets[key]; // Remove the key if no assets are left
        }
      });

      // Update assetRelations based on the remaining nodes and edges
      const newAssetRelations:any = { ...assetRelations };
      Object.keys(newAssetRelations).forEach((parentId) => {
        Object.keys(newAssetRelations[parentId]).forEach((relationType) => {
          newAssetRelations[parentId][relationType] = newAssetRelations[
            parentId
          ][relationType].filter(
            (childAssetId: unknown) => !nodeIdsToDelete.has(childAssetId)
          );
          if (newAssetRelations[parentId][relationType].length === 0) {
            delete newAssetRelations[parentId][relationType]; // Remove the relation type if no child assets are left
          }
        });
        if (Object.keys(newAssetRelations[parentId]).length === 0) {
          delete newAssetRelations[parentId]; // Remove the parent asset if it has no relations left
        }
      });

      setNodes(newNodes);
      setEdges(newEdges);
      setShopFloorAssets(newShopFloorAssets);
      setAssetRelations(newAssetRelations); // Update state with the modified asset relations

      // Log the updated state for verification
      console.log(
        "Updated ShopFloorAssets after deletion:",
        newShopFloorAssets
      );
      console.log("Updated AssetRelations after deletion:", newAssetRelations);
    }
  }, [
    selectedElements,
    nodes,
    edges,
    shopFloorAssets,
    assetRelations,
    setNodes,
    setEdges,
    setShopFloorAssets,
    setAssetRelations,
  ]);

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

      // Filter out child nodes and edges, preserving the parent node
      const filteredNodes = nodes.filter((node) =>
        node.id.startsWith("factory")
      );
      const filteredEdges = edges.filter(
        (edge) =>
          edge.source.startsWith("factory") && edge.target.startsWith("factory")
      );

      setNodes(filteredNodes);
      setEdges(filteredEdges);

      // Prepare the payload for updating assets and relations
      const shopFloorUpdates = Object.entries(shopFloorAssets)
        .filter(([shopFloorId, _]) => shopFloorId.startsWith("shopFloor_"))
        .reduce((acc: any, [shopFloorId, assets]) => {
          acc[shopFloorId] = [];
          return acc;
        }, {});

      const updateAssetPayload = {
        shopFloors: shopFloorUpdates,
      };

      const updateRelationPayload = {
        assetRelations: {},
      };
      console.log(updateAssetPayload, updateRelationPayload, "  The data");

      await axios.patch(
        `${API_URL}/shop-floor/update-asset`,
        updateAssetPayload.shopFloors,
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          withCredentials: true,
        }
      );

      await axios.patch(
        `${API_URL}/asset/update-relations`,
        updateRelationPayload.assetRelations,
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          withCredentials: true,
        }
      );
      // setShopFloorAssets([]);
      // setAssetRelations([]);
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
            const closestShopFloorId = determineClosestShopFloor(position);
            const factoryNodeId = `${factory.id}`;
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

              setShopFloorAssets((prev:any) => ({
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

  const handleUpdate = useCallback(async () => {
    let shopFloorData = await getShopFloorAndAssetData(factoryId);

    const relationList = await extractHasRelations(shopFloorData?.assetsData);

    console.log(relationList, "RelationList");

    shopFloorData = shopFloorData?.assetIds;

    const simplifyAssetId = (assetId: string) => {
      const parts = assetId.split("_");
      const idPartsWithoutTimestamp = parts[1].split(":");
      idPartsWithoutTimestamp[idPartsWithoutTimestamp.length - 1] =
        idPartsWithoutTimestamp[idPartsWithoutTimestamp.length - 1].split(
          ":"
        )[0];
      return idPartsWithoutTimestamp.join(":");
    };

    const getUniqueAssetsForShopFloor = (shopFloorId: string) => {
      const directAssets = new Set(shopFloorAssets[shopFloorId] || []);

      edges.forEach((edge) => {
        const sourceNode = nodes.find((node) => node.id === edge.source);
        const targetNode = nodes.find((node) => node.id === edge.target);

        if (sourceNode && targetNode) {
          if (
            sourceNode.data.type === "relation" &&
            targetNode.data.type === "asset"
          ) {
            if (sourceNode.data.parentId === shopFloorId) {
              directAssets.add(simplifyAssetId(targetNode.id));
            }
          }
        }
      });

      return Array.from(directAssets);
    };

    const shopFloorUpdates = Object.entries(shopFloorAssets)
      .filter(([shopFloorId, _]) => shopFloorId.startsWith("shopFloor_"))
      .reduce((acc: any, [shopFloorId, assets]) => {
        const simplifiedAssets =
          getUniqueAssetsForShopFloor(shopFloorId).map(simplifyAssetId);

        const simplifiedShopFloorId = shopFloorId.replace(
          /^shopFloor_urn:ngsi-ld:shopFloors:/,
          ""
        );

        acc[`urn:ngsi-ld:shopFloors:${simplifiedShopFloorId}`] =
          simplifiedAssets;

        return acc;
      }, {});

    if (shopFloorData?.shopFloorId && shopFloorData?.assetIds) {
      const simplifiedNewAssetId = simplifyAssetId(shopFloorData.assetIds);
      const existingAssets = getUniqueAssetsForShopFloor(
        shopFloorData.shopFloorId
      );

      // Check if the new asset ID is already included; if not, append it
      if (!existingAssets.includes(simplifiedNewAssetId)) {
        existingAssets.push(simplifiedNewAssetId);
      }
      // Construct the update payload for the specific shop floor
      shopFloorUpdates[shopFloorData.shopFloorId] = existingAssets;

      console.log(shopFloorData, " The Data");
    }

    const updateAssetPayload = {
      shopFloors: shopFloorUpdates,
    };

    console.log("Updating assets YYY:", updateAssetPayload.shopFloors);

    const simplifiedAssetRelations = Object.entries(assetRelations).reduce(
      (acc: any, [assetId, relations]: any) => {
        const simplifiedAssetId = simplifyAssetId(assetId);
        acc[simplifiedAssetId] = Object.entries(relations).reduce(
          (relAcc: any, [relationType, relatedAssets]: any) => {
            relAcc[relationType] = relatedAssets.map(simplifyAssetId);
            return relAcc;
          },
          {}
        );
        return acc;
      },
      {}
    );
    console.log(simplifiedAssetRelations, "ooooooooo");

    const updateRelationPayload = {
      assetRelations: simplifiedAssetRelations,
    };
    console.log(updateRelationPayload.assetRelations, "kkkkkkkkkkk");

    function mergeRelations(relationList: any, simplifiedAssetRelations: any) {
      // Iterate through each relation key in relationList
      Object.entries(relationList).forEach(([relationKey, relationData]) => {
        // Ensure relationData.object is treated as an array for consistency
        const relationDataObjects = Array.isArray(relationData.object)
          ? relationData.object
          : [relationData.object];

        // Iterate through each assetId and its relations in simplifiedAssetRelations
        Object.entries(simplifiedAssetRelations).forEach(
          ([assetId, relations]) => {
            // Check if the current relationKey from relationList exists in the relations of the current asset
            if (relations[relationKey]) {
              // If so, filter out any objects that are already listed in relationDataObjects
              const filteredObjects = relations[relationKey].filter(
                (objId: any) => !relationDataObjects.includes(objId)
              );

              // If after filtering, there are no objects left, delete the relationKey from this asset's relations
              if (filteredObjects.length === 0) {
                delete relations[relationKey];
              } else {
                // Otherwise, update the relationKey with the filtered objects
                relations[relationKey] = filteredObjects;
              }
            }

            // Additionally, if relationList has new objects that are not in the current relations, add them
            relationDataObjects.forEach((objId: any) => {
              if (
                !relations[relationKey] ||
                !relations[relationKey].includes(objId)
              ) {
                if (!relations[relationKey]) {
                  relations[relationKey] = [];
                }
                relations[relationKey].push(objId);
              }
            });
          }
        );
      });

      // Return the updated simplifiedAssetRelations after merging
      return simplifiedAssetRelations;
    }

    const mergedRelations = mergeRelations(
      relationList,
      simplifiedAssetRelations
    );

    console.log(mergedRelations, simplifiedAssetRelations, "Merged Relations");

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
        shopFloor: shopFloorData,
      },
    };

    try {
      await axios.patch(`${API_URL}/react-flow/${factoryId}`, payLoad, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        withCredentials: true,
      });

      setToastMessage("Flowchart updated successfully");

      try {
        if (Object.keys(updateAssetPayload.shopFloors).length > 0) {
          console.log(updateAssetPayload.shopFloors, "Final data");
          await axios.patch(
            `${API_URL}/shop-floor/update-asset`,
            updateAssetPayload.shopFloors,
            {
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              withCredentials: true,
            }
          );
          console.log("Shop floor assets updated successfully.");
        } else {
          console.log("No shop floor assets to update.");
        }
        console.log(mergedRelations.length, "oooooooooooo");

        if (Object.keys(mergedRelations).length > 0) {
          await axios.patch(
            `${API_URL}/asset/update-relation`,
            mergedRelations,
            {
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              withCredentials: true,
            }
          );
          console.log("Asset relations updated successfully.");
        } else {
          console.log("No asset relations to update.");
        }

        setToastMessage("Data updated successfully");
      } catch (error) {
        setToastMessage("Error updating data");
        console.error("Error updating data:", error);
      }
    } catch (error) {
      setToastMessage("Error updating data");
      console.error("Error updating data:", error);
    }
  }, [factoryId, nodes, edges, shopFloorAssets, assetRelations]);

  const handleSave = useCallback(async () => {
    const simplifyAssetId = (assetId: string) => {
      const parts = assetId.split("_");
      const idPartsWithoutTimestamp = parts[1].split(":");
      idPartsWithoutTimestamp[idPartsWithoutTimestamp.length - 1] =
        idPartsWithoutTimestamp[idPartsWithoutTimestamp.length - 1].split(
          ":"
        )[0];
      return idPartsWithoutTimestamp.join(":");
    };

    const getUniqueAssetsForShopFloor = (shopFloorId: string) => {
      const directAssets = new Set(shopFloorAssets[shopFloorId] || []);

      edges.forEach((edge) => {
        const sourceNode = nodes.find((node) => node.id === edge.source);
        const targetNode = nodes.find((node) => node.id === edge.target);

        if (sourceNode && targetNode) {
          if (
            sourceNode.data.type === "relation" &&
            targetNode.data.type === "asset"
          ) {
            if (sourceNode.data.parentId === shopFloorId) {
              directAssets.add(simplifyAssetId(targetNode.id));
            }
          }
        }
      });

      return Array.from(directAssets);
    };

    const shopFloorUpdates = Object.entries(shopFloorAssets)
      .filter(([shopFloorId, _]) => shopFloorId.startsWith("shopFloor_"))
      .reduce((acc: any, [shopFloorId, assets]) => {
        const simplifiedAssets =
          getUniqueAssetsForShopFloor(shopFloorId).map(simplifyAssetId);

        const simplifiedShopFloorId = shopFloorId.replace(
          /^shopFloor_urn:ngsi-ld:shopFloors:/,
          ""
        );

        acc[`urn:ngsi-ld:shopFloors:${simplifiedShopFloorId}`] =
          simplifiedAssets;

        return acc;
      }, {});

    const updateAssetPayload = {
      shopFloors: shopFloorUpdates,
    };

    const simplifiedAssetRelations = Object.entries(assetRelations).reduce(
      (acc: any, [assetId, relations]: any) => {
        const simplifiedAssetId = simplifyAssetId(assetId);
        acc[simplifiedAssetId] = Object.entries(relations).reduce(
          (relAcc: any, [relationType, relatedAssets]: any) => {
            relAcc[relationType] = relatedAssets.map(simplifyAssetId);
            return relAcc;
          },
          {}
        );
        return acc;
      },
      {}
    );

    const updateRelationPayload = {
      assetRelations: simplifiedAssetRelations,
    };
    console.log("Relation", updateRelationPayload.assetRelations);
    console.log("Asset", updateAssetPayload.shopFloors);
    onSave();
    try {
      // Conditional API call for updating shop floor assets
      if (Object.keys(updateAssetPayload.shopFloors).length > 0) {
        await axios.patch(
          `${API_URL}/shop-floor/update-asset`,
          updateAssetPayload.shopFloors,
          {
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            withCredentials: true,
          }
        );
        console.log("Shop floor assets updated successfully.");
      } else {
        console.log("No shop floor assets to update.");
      }

      // Conditional API call for updating asset relations
      if (Object.keys(updateRelationPayload.assetRelations).length > 0) {
        await axios.patch(
          `${API_URL}/asset/update-relation`,
          updateRelationPayload.assetRelations,
          {
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            withCredentials: true,
          }
        );
        console.log("Asset relations updated successfully.");
      } else {
        console.log("No asset relations to update.");
      }
    } catch (error) {
      console.error("Error while updating data:", error);
      // Handle error appropriately
    }
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
          onInit={onInit}
          onNodeDoubleClick={onNodeDoubleClick}
          onSelectionChange={onSelectionChange}
          fitView
          ref={elementRef}
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
