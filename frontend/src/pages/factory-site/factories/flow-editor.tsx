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
  ReactFlowInstance,
  Connection
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
import { Factory } from "@/interfaces/factoryType";
import EdgeAddContext from "@/context/EdgeAddContext";
import { RelationsModal } from "@/components/reactFlowRelationModal";
import CustomAssetNode from "@/components/customAssetNode";
import { useShopFloor } from "@/context/shopFloorContext";
interface FlowEditorProps {
  factory: Factory;
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

interface RelationCounts {
  [key: string]: number;
}


interface Edge {
  id:string,
  source:string | null;
  metadata:string,
  target?:string ;
 
}
interface FactoryRelationships {
  hasShopFloor: {
    object: string[];
  };
}

interface FactoryNodeData {
  label?: string;
  type: string;
  undeletable?: boolean;
}
const nodeTypes = {
  asset: CustomAssetNode,
};

const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;
const FlowEditor: React.FC<
  FlowEditorProps & { deletedShopFloors: string[] }
> = ({ factory, factoryId, deletedShopFloors }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedElements, setSelectedElements] = useState<OnSelectionChangeParams | null>(null);
  const [factoryRelationships, setFactoryRelationships] = useState<object>({});
  const onSelectionChange = useCallback(
    (params: OnSelectionChangeParams | null) => {
      setSelectedElements(params);
    },
    []
  ); 
  const [nodeUpdateTracker, setNodeUpdateTracker] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toast = useRef<Toast>(null);
  const [droppedShopFloors, setDroppedShopFloors] = useState<object[]>([]);
  const [assetRelations, setAssetRelations] = useState({});
  const router = useRouter();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance  | null>(null);
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
  const { latestShopFloor } = useShopFloor();
  const onEdgeAdd = (assetId: string, relationsInput: string,relationClass:string) => {
    const assetNode = nodes.find((node) => node.id === selectedAsset);
    if (!assetNode) {
      console.error("Selected asset node not found");
      return;
    }
  
    // handle both single and multiple relations uniformly
    const relations = Array.isArray(relationsInput)
      ? relationsInput
      : [relationsInput];

    relations.forEach((relationName) => {
      // Increment the count for this specific relation, or initialize it if not present
      const newCount = (relationCounts[relationName] || 0) + 1;
      const updatedRelationCounts = {
        ...relationCounts,
        [relationName]: newCount,
      };
      // Persist the updated counts
      setRelationCounts(updatedRelationCounts);

      // Calculate position based on existing relations to avoid overlap
      let existingRelationsCount = nodes.filter(
        (node) =>
          node.data.type === "relation" && node.data.parentId === selectedAsset
      ).length;
      let baseXOffset = 200 + existingRelationsCount * 200;

      // Create the ID using the updated count
      const relationNodeId = `relation_${relationName}_${String(
        newCount
      ).padStart(3, "0")}`;

      const newRelationNode = {
        id: relationNodeId,
        style: {
          backgroundColor: "#ead6fd",
          border: "none",
          borderRadius: "45%",
        },
       class:relationClass,
        data: {
          label: `${relationName}_${String(newCount).padStart(3, "0")}`,
          type: "relation",
          parentId: selectedAsset,
        },
        position: {
          x: assetNode.position.x + baseXOffset, // adjusted x offset
          y: assetNode.position.y + 200, // fixed y offset for visual consistency
        },
      };

      //  new edge connecting the asset node to the new relation node
      const newEdge: any = {
        id: `reactflow__edge-${selectedAsset}-${relationNodeId}`,
        source: selectedAsset ?? '',
        target: relationNodeId ?? '',
        metadata:relationNodeId
      };

      // Update state with the new node and edge
      setNodes((prevNodes) => [...prevNodes, newRelationNode]);
      setEdges((prevEdges) => addEdge(newEdge, prevEdges));
    });
  };

  useEffect(() => {
    if (latestShopFloor && reactFlowInstance) {
      const factoryNodeId = `factory-${factoryId}`;
      const factoryNode = nodes.find((node) => node.id === factoryNodeId);
      const shopFloorNodeId = `shopFloor_${latestShopFloor.id}`;

      // Prevent adding the node if it already exists
      const nodeExists = nodes.some((node) => node.id === shopFloorNodeId);

      if (factoryNode && !nodeExists) {
        // Calculate positions based on existing shopFloor nodes
        const gapX = 250; // Horizontal gap between shopFloor nodes
        const startY = factoryNode.position.y + 90; // Y position below the factory node

        // Calculate X position based on the number of existing shopFloor nodes
        const existingShopFloors = nodes.filter(
          (node) => node.data.type === "shopFloor"
        );
        const newXPosition =
          factoryNode.position.x + existingShopFloors.length * gapX - 100;

        const newNode = {
          id: shopFloorNodeId,
          type: "shopFloor",
          data: { label: `${latestShopFloor.name}`, type: "shopFloor" },
          position: { x: newXPosition, y: startY },
          style: { backgroundColor: "#faedc4", border: "none" },
        };

        setNodes((nds) => [...nds, newNode]);

        const newEdge = {
          id: `reactflow__edge-${factoryNodeId}-${shopFloorNodeId}`,
          source: factoryNodeId,
          target: shopFloorNodeId,
          metadata:shopFloorNodeId
        };

        setEdges((eds) => [...eds, newEdge]);
      }
    }
  }, [latestShopFloor, reactFlowInstance, nodes, setNodes, setEdges]);

  useEffect(() => {
    deletedShopFloors.forEach((deletedShopFloorId) => {
      const shopFloorNodeId = `shopFloor_${deletedShopFloorId}`;
      setNodes((nodes) => nodes.filter((node) => node.id !== shopFloorNodeId));
      setEdges((edges) =>
        edges.filter(
          (edge) =>
            edge.source !== shopFloorNodeId && edge.target !== shopFloorNodeId
        )
      );
    });
  }, [deletedShopFloors, setNodes, setEdges, nodes]);


  // useEffect(() => {
  //   if (factory && reactFlowInstance) {
  //     const factoryNodeId = `factory-${factory.id}`;
  //     const factoryNode: Node<FactoryNodeData> = {
  //       id: factoryNodeId,
  //       type: "factory",
  //       position: { x: 250, y: 70 },
  //       data: {
  //         label: factory.factory_name,
  //         type: `factory`,
  //         undeletable: true,
  //       },
  //     };

  //     setNodes((currentNodes) => [...currentNodes, factoryNode]);
  //     setNodeUpdateTracker((prev) => prev + 1);
  //     setFactoryRelationships((currentRelationships) => ({

       
  //       ...currentRelationships,
  //       [factoryNodeId]: {
  //         hasShopFloor: {
  //           object: currentRelationships[factoryNodeId]?.hasShopFloor?.object
  //             ? [
  //                 ...currentRelationships[factoryNodeId].hasShopFloor.object,
  //                 factoryNodeId,
  //               ]
  //             : [factoryNodeId],
  //         },
  //       },
  //     }));
  //     setNodesInitialized(true);
  //   }
  // }, [factory, reactFlowInstance, setNodes]);

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
  }, [nodesInitialized, factoryId, API_URL]);

  const onRestore = useCallback(async () => {
     setNodesInitialized(true);
    if (factoryId) {
      try {
        const response = await axios.get(`${API_URL}/react-flow/${factoryId}`, {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          withCredentials: true,
        });

        if (
          response.data &&
          response.data.factoryData.nodes &&
          response.data.factoryData.edges
        ) {
          // First, set the nodes and edges as usual
          setNodes(response.data.factoryData.nodes);
          setEdges(response.data.factoryData.edges);

          // Then, analyze the relation nodes to update relationCounts
          const updatedRelationCounts: any = {};

          response.data.factoryData.nodes.forEach((node: Node) => {
            if (node.data.type === "relation") {
              // node IDs follow the format "relation-relationName_count"
              const match = node.id.match(/relation-(.+)_([0-9]+)/);
              if (match) {
                const [, relationName, count] = match;
                const numericCount = parseInt(count, 10);
                // Update the relationCounts state with the highest count for each relation
                if (
                  !updatedRelationCounts[relationName] ||
                  updatedRelationCounts[relationName] < numericCount
                ) {
                  updatedRelationCounts[relationName] = numericCount;
                }
              }
            }
          });

          // Update the relationCounts state to reflect the highest counts found
          setRelationCounts(updatedRelationCounts);
        } else {
          console.log("Invalid data received from backend");
        }
      } catch (error) {
        console.error("Error fetching flowchart data:", error);
      }
    }
  }, [setNodes, setEdges, factoryId, setRelationCounts]);

  useEffect(() => {
    onRestore();
  }, [onRestore]);

  const onUpdate = useCallback(async () => {
    let metadata= ""
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
        edges: edges.map(({ id, source, target,type, data }) => ({
          id,
          source,
          target,
          metadata:target,
          type,
          data,
        })),
      },
    };

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
          // params: { id: factoryId },
        }
      );

      if (response.status == 200 || response.status == 204) {
        setToastMessage("Flowchart Updated successfully");
      } else {
        setToastMessage("FlowChart already exist");
      }

      // const response1 = await axios.patch(
      //   `${API_URL}/shop-floor/update-react`,
      //   payLoad.factoryData.edges,
      //   {
      //     headers: {
      //       "Content-Type": "application/json",
      //       Accept: "application/json",
      //     },
      //     withCredentials: true,
      //   }
      // );
      console.log(payLoad.factoryData.edges, "edges update");
      // if (response1.status == 200 || response1.status == 204) {
      //   setToastMessage("Scorpio updated successfully");
      // } else {
      //   setToastMessage("Scorpio already has these data");
      // }
    } catch (error) {
      console.error("Error saving flowchart:", error);
      setToastMessage("Error saving flowchart");
    }
  }, [nodes, edges, factoryId]);

  const onSave = useCallback(async () => {
    let metadata= ""
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
          metadata:target,
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
      console.log(response, "Onsave first");
      if (response.status === 201) {
        setToastMessage("Flowchart saved successfully");
      } else {
        setToastMessage("Flowchart already exist");
      }

      const response1 = await axios.patch(
        `${API_URL}/shop-floor/update-react/`,
        payLoad.factoryData.edges,
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          withCredentials: true,
          params: { id: factoryId },
        }
      );
      const response2 = await axios.patch( `${API_URL}/allocated-asset`,
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          withCredentials: true,
        
        }
      );

      console.log("allocated asset Data " , response2)
      if (response1.status == 200 || response1.status == 204) {
        setToastMessage("Scorpio updated successfully");
      } else {
        setToastMessage("Data Already Exist in Scorpio");
      }
    } catch (error) {
      console.error("Error saving flowchart:", error);
      setToastMessage("Error saving flowchart");
    }
  }, [nodes, edges, factoryId]);
  //
  const handleDelete = async () => {
    const preservedNodeTypes = new Set(["factory", "shopFloor"]);
    const preservedNodes = nodes.filter((node) =>
      preservedNodeTypes.has(node.type || node.data.type)
    );
    const preservedNodeIds = new Set(preservedNodes.map((node) => node.id));

    // Preserving edges that connect factory to shopFloor directly
    const preservedEdges = edges.filter(
      (edge) =>
        preservedNodeIds.has(edge.source) && preservedNodeIds.has(edge.target)
    );

    // Update the state to only include preserved nodes and edges
    setNodes(preservedNodes);
    setEdges(preservedEdges);
    console.log(preservedNodeIds, preservedEdges, "Nodes edges preserved");

    try {
      const response1 = await axios.patch(
        `${API_URL}/react-flow/${factoryId}`,
        edges,
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          withCredentials: true,
        }
      );

      const response2 = await axios.delete(
        `${API_URL}/shop-floor/delete-react/${factoryId}`,
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          withCredentials: true,
          params: { id: factoryId },
        }
      );

      if (
        response1.status == 200 ||
        (response1.status == 204 && response2.status == 204) ||
        response2.status == 200
      ) {
        setToastMessage(
          "Selected elements and related data deleted successfully."
        );
      } else {
        setToastMessage("Partial deletion: Please check the data.");
      }
    } catch (error) {
      console.error("Error deleting elements:", error);
      setToastMessage("Error deleting elements.");
    } finally {
      // Regardless of the result, try to refresh the state to reflect the current backend state

      setIsSaveDisabled(false);
    }
  };

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
      const { source, target} = params;
      const sourceNode: any = nodes.find((node) => node.id === source);
      const targetNode: any = nodes.find((node) => node.id === target);

      if (!sourceNode || !targetNode) return;
      // Check if the source node is a relation and it already has an outgoing connection
      if (sourceNode.data.type === "relation") {
        const alreadyHasChild = edges.some((edge) => edge.source === source);
        const relationClass = sourceNode.class;
        if (relationClass === "machine" && edges.some(edge => edge.source === source)) {
          toast.current?.show({
            severity: "warn",
            summary: "Operation not allowed",
            detail: "A machine relation can only have one child asset.",
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
        // access the asset_category and split it.
        const assetCategoryPart =
          targetNode.asset_category?.split(" ")[1] || "";
        const assetCategory = assetCategoryPart.toLowerCase();
        console.log("asset category", assetCategory);

        // relation label is like "hasTracker_001", extract "Tracker" and normalize
        const relationType = sourceNode.data.label
          .split("_")[0]
          .replace("has", "")
          .toLowerCase();
        console.log(relationType, "relation type");
        // Check if the asset category === the relation type
        if (assetCategory && assetCategory !== relationType) {
          toast.current?.show({
            severity: "warn",
            summary: "Connection not allowed",
            detail: `Assets of category '${
              targetNode.asset_category
            }' can only connect to 'has${
              assetCategory.charAt(0).toUpperCase() + assetCategory.slice(1)
            }' relations.`,
          });
          return; // Prevent the connection
        }
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
            return { ...edge, source: newRelationNodeId , metadata:newRelationNodeId };
          } else if (edge.target === sourceNode.id) {
            return { ...edge, target: newRelationNodeId , metadata:newRelationNodeId};
          }

          console.log(edge)
          return edge;
        });

        // Add a new edge for the current connection
        const newEdge = {
          id: `reactflow_edge-${newRelationNodeId}`,
          source: newRelationNodeId,
          target: childAssetId,
          metadata:childAssetId,
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
        console.log(edges, "Edges last");
      } else {
        if (toast) {
          console.log(sourceNode, targetNode, "The nodes data");
          toast.current?.show({
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
    if (!selectedElements) {
      return;
    }

    // Exclude the factory and shopFloor Nodes from deletion
    const containsNonDeletableNodes = selectedElements.nodes?.some(
      (node: Node) =>
        node.data.type === "factory" || node.data.type === "shopFloor"
    );

    if (containsNonDeletableNodes) {
      toast.current?.show({
        severity: "warn",
        summary: "Deletion Not Allowed",
        detail: "You cannot delete factory or shopFloor nodes from here.",
        life: 3000,
      });
      return;
    }

    const nodeIdsToDelete = new Set(
      selectedElements.nodes?.map((node: Node) => node.id)
    );
    let updatedNodes = [...nodes];
    let updatedEdges = [...edges];

    // Updating relation nodes and edges if their child is being deleted
    edges.forEach((edge) => {
      if (nodeIdsToDelete.has(edge.target)) {
        const sourceNode = nodes.find((node) => node.id === edge.source);
        if (sourceNode && sourceNode.data.type === "relation") {
          //  if the node ID indicates it's connected to a specific child
          const newId = sourceNode.id.split("_asset_")[0]; // relation node ID format is "relation_<relationName>_<uniqueId>_asset_<assetId>"
          // Update node ID and edges
          updatedNodes = updatedNodes.map((node) =>
            node.id === sourceNode.id ? { ...node, id: newId } : node
          );
          updatedEdges = updatedEdges.map((edge) => ({
            ...edge,
            source: edge.source === sourceNode.id ? newId : edge.source,
            target: edge.target === sourceNode.id ? newId : edge.target,
            metadata:edge.target === sourceNode.id ? newId : edge.target,
          }));
        }
      }
    });

    // Filter out the nodes and edges  to be deleted
    updatedNodes = updatedNodes.filter((node) => !nodeIdsToDelete.has(node.id));
    updatedEdges = updatedEdges.filter(
      (edge) =>
        !nodeIdsToDelete.has(edge.source) && !nodeIdsToDelete.has(edge.target)
    );

    setNodes(updatedNodes);
    setEdges(updatedEdges);

    setSelectedElements(null);
  }, [
    selectedElements,
    nodes,
    edges,
    setNodes,
    setEdges,
    setSelectedElements,
    toast,
  ]);

  useHotkeys(
    "backspace",
    (event) => {
      event.preventDefault(); // Prevent the default backspace behavior (e.g., navigating back)
      handleBackspacePress();
    },
    [handleBackspacePress]
  );

  const onNodeDoubleClick = useCallback(
    (event: any, node: any) => {
      console.log(node, "JKB");
      if (node.type === "shopFloor") {
        router.push("/factory-site/dashboard");
      }
    },
    [router]
  );

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (!reactFlowInstance || !reactFlowWrapper.current) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const data = event.dataTransfer.getData("application/json");

      try {
        const { item, type, asset_category } = JSON.parse(data);

        console.log(
          "Parsed item:",
          item,
          "Type:",
          type,
          "Asset Catagory: ",
          asset_category
        );
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
                asset_category: item.asset_category,
                position,
                data: {
                  type: type,
                  label,

                  id: item.id,
                }
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
      toast.current?.show({
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

  const onInit = useCallback((instance: ReactFlowInstance) => {
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
            deleteKeyCode={null}
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
