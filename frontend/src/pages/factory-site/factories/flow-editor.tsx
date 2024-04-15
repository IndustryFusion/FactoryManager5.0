import React, { useState, useEffect, useRef, useCallback,MouseEvent  } from "react";
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
  Connection,NodeMouseHandler 
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
  fetchAssetById,customLogger 
} from "@/utility/factory-site-utility";
import { Factory } from "@/interfaces/factory-type";
import EdgeAddContext from "@/context/edge-add-context";
import { RelationsModal } from "@/components/reactflow-relation-modal";
import CustomAssetNode from "@/components/custom-asset-node";
import { useShopFloor } from "@/context/shopfloor-context";
import { Dialog } from "primereact/dialog";
import { BlockUI } from "primereact/blockui";
import { InputSwitch } from "primereact/inputswitch";
import "../../../styles/asset-list.css"

interface FlowEditorProps {
  factory: Factory;
  factoryId: string;
}

interface RelationCounts {
  [key: string]: number;
}

interface ExtendedNodeData {
  label: string;
  id: string;
}

interface ExtendedNode extends Node<ExtendedNodeData> {
  width: number;
  height: number;
  selected: boolean;
  dragging: boolean;
  positionAbsolute: {
    x: number;
    y: number;
  };
  data:{
    type:string,
    label:string,
    id:string,
    class?:string
    parentId?:string
    
  },
  asset_category?:string

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
  const [nodes, setNodes, onNodesChangeProvide] = useNodesState([]);
  const [edges, setEdges, onEdgesChangeProvide] = useEdgesState([]);
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
  const [loadedFlowEditor , setLoadedFlowEditor] = useState(false)  ;
  const [relationCounts, setRelationCounts] = useState<Record<string, number>>(
    {}
  );
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const { latestShopFloor } = useShopFloor();

  const [isDialogVisible, setIsDialogVisible] = useState(false);
  const [nextUrl, setNextUrl] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [isRestored, setIsRestored] = useState(false);
  const [originalNodes, setOriginalNodes] = useState([]);
  const [originalEdges, setOriginalEdges] = useState([]);
  const [isOperationInProgress, setIsOperationInProgress] = useState(false);
  const [formView, setFormView] = useState(false);

 // @desc : when in asset Node we get dropdown Relation then its creating relation node & connecting asset to hasRelation Edge
  const onEdgeAdd = (assetId: string, relationsInput: string,relationClass:string) => {
    console.log(relationClass, "class", assetId, "assetId")
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
     
        data: {
          label: `${relationName}_${String(newCount).padStart(3, "0")}`,
          type: "relation",
          class:relationClass,
          parentId: selectedAsset,
        },
        position: {
          x: assetNode.position.x + baseXOffset, // adjusted x offset
          y: assetNode.position.y + 200, // fixed y offset for visual consistency
        },
      };

      //  new edge connecting the asset node to the new relation node
      const newEdge = {
        id: `reactflow__edge-${selectedAsset}-${relationNodeId}_${new Date().getTime()}`,
        source: selectedAsset ?? '',
        target: relationNodeId ?? '',
       
      };

      // Update state with the new node and edge
      setNodes((prevNodes) => [...prevNodes, newRelationNode]);
      setEdges((prevEdges) => addEdge(newEdge, prevEdges));
    });
  };


  useEffect(() => {   
      const originalWarn = console.warn;
      console.warn = (...args) => {
        const [message] = args;
        if (!/Node type "(factory|shopFloor)" not found/.test(message)) {
          originalWarn.apply(console, args);
        }
      };
    
    //@desc : When we create new ShopFloor 
    if (latestShopFloor && reactFlowInstance) {
      const factoryNodeId = `factory_${factoryId}`;
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
          data: { label: `${latestShopFloor.name.value}`, type: "shopFloor" },
          position: { x: newXPosition, y: startY },
          style: { backgroundColor: "#faedc4", border: "none" },
        };

        setNodes((nds) => [...nds, newNode]);

        const newEdge = {
          id: `reactflow__edge-${factoryNodeId}-${shopFloorNodeId}_${new Date().getTime()}`,
          source: factoryNodeId,
          target: shopFloorNodeId,
     
        };

        setEdges((eds) => [...eds, newEdge]);
      }
    }

    if(deletedShopFloors){
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
    }
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
      setNodesInitialized(false);
      
    }
     if (factory && reactFlowInstance && !loadedFlowEditor ) {
      const factoryNodeId = `factory_${factory.id}`;
      const factoryNode: Node<FactoryNodeData> = {
        id: factoryNodeId,
        type: "factory",
        position: { x: 250, y: 70 },
        data: {
          label: factory.factory_name,
          type: `factory`,
          undeletable: true,
        },
      };

      setNodes((currentNodes) => [...currentNodes, factoryNode]);
      setNodesInitialized(true);
      onRestore();
      setLoadedFlowEditor(true)
    }

     if (toastMessage) {
    toast.current?.show({
      severity: 'success', 
      summary: toastMessage,
      life: 3000, 
    });

    setToastMessage(null);
  }
  return () => {
    console.warn = originalWarn;
  };
   
  }, [latestShopFloor, reactFlowInstance, nodes, setNodes, setEdges, deletedShopFloors,nodesInitialized, factoryId, API_URL,toastMessage] );


useEffect(() => {
    const handleRouteChange = (url: string) => {
      if (hasChanges && !isDialogVisible) {
        setNextUrl(url); 
        setIsDialogVisible(true);
        return false;
      }
      return true; 
    };

    router.beforePopState(({ url }) => handleRouteChange(url));

    return () => router.beforePopState(() => true);
  }, [hasChanges, isDialogVisible, router]);


const checkForNewAdditions = useCallback(() => {
  const newNodesAdded = nodes.length > originalNodes.length  || nodes.length < originalNodes.length;
  const newEdgesAdded = edges.length > originalEdges.length  ||  edges.length < originalEdges.length;

  return newNodesAdded || newEdgesAdded;
}, [nodes, edges, originalNodes, originalEdges]);


const onNodesChange = useCallback((changes:any) => {
  onNodesChangeProvide(changes);
  if (isRestored && checkForNewAdditions()) {
    setHasChanges(true);
  }
}, [onNodesChangeProvide, isRestored, checkForNewAdditions]);

const onEdgesChange = useCallback((changes:any) => {
  onEdgesChangeProvide(changes);
  if (isRestored && checkForNewAdditions()) {
    setHasChanges(true);
  }
}, [onEdgesChangeProvide, isRestored, checkForNewAdditions]);

  const onRestore = useCallback(async () => {
   
    if (factoryId) {
      try {
        setIsOperationInProgress(true);
        const getReactFlowMongo = await axios.get(`${API_URL}/react-flow/${factoryId}`, {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          withCredentials: true,
        });

        if (
          getReactFlowMongo.data &&
          getReactFlowMongo.data.factoryData.nodes &&
          getReactFlowMongo.data.factoryData.edges
        ) {
          // First, set the nodes and edges as usual
          setNodes(getReactFlowMongo.data.factoryData.nodes);
          setEdges(getReactFlowMongo.data.factoryData.edges);
          
          // Set original nodes and edges right after restoration
          setOriginalNodes(getReactFlowMongo.data.factoryData.nodes);
          setOriginalEdges(getReactFlowMongo.data.factoryData.edges);
          
          setIsRestored(true); 
          // Then, analyze the relation nodes to update relationCounts
          const updatedRelationCounts: RelationCounts = {};

          getReactFlowMongo.data.factoryData.nodes.forEach((node: Node) => {
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

      finally{
         setIsOperationInProgress(false);
      }
    }

  }, [setNodes, setEdges, factoryId, setRelationCounts]);

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
        edges: edges.map(({ id, source, target,type, data }) => ({
          id,
          source,
          target,
       
          type,
          data,
        })),
      },
    };

    try {

        setIsOperationInProgress(true);
      const reactFlowUpdateMongo = await axios.patch(
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

      if (reactFlowUpdateMongo.status == 200 || reactFlowUpdateMongo.status == 204) {
        setToastMessage("Flowchart Updated successfully");
      } else {
        setToastMessage("FlowChart already exist");
      }
     const reactAllocatedAssetScorpio = await axios.patch(API_URL + '/allocated-asset',
       payLoad.factoryData.edges,{
        params: {
          "factory-id": factoryId,
        },
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        withCredentials: true,
      });
       if (reactAllocatedAssetScorpio.status == 200 || reactAllocatedAssetScorpio.status == 204  || reactAllocatedAssetScorpio.status == 201) {
        setToastMessage("Allocated Asset Scorpio Updated");
      } else {
        setToastMessage("Allocated Asset Scorpio Not Updated");
      }
      const reactFlowScorpioUpdate = await axios.patch(
        `${API_URL}/shop-floor/update-react`,
        payLoad.factoryData.edges,
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          withCredentials: true,
        }
      );
      console.log(payLoad.factoryData.edges, "edges update");
      if (reactFlowScorpioUpdate.status == 200 || reactFlowScorpioUpdate.status == 204) {
        setToastMessage("Scorpio updated successfully");
      } else {
        setToastMessage("Scorpio already has these data");
      }
      onRestore();
   
    } catch (error) {
      console.error("Error saving flowchart:", error);
      setToastMessage("");
    }
    finally{
      setIsOperationInProgress(false);

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

      setIsOperationInProgress(true);
      const reactFlowUpdateMongo = await axios.post(`${API_URL}/react-flow`, payLoad, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        withCredentials: true,
      });
 
      if (reactFlowUpdateMongo.status == 201 ) {
        setToastMessage("Flowchart saved successfully");
      } else {
        setToastMessage("Flowchart already exist");
      }
       
       const reactAllocatedAssetScorpio = await axios.post(API_URL + '/allocated-asset',
       payLoad.factoryData.edges,{
        params: {
          "factory-id": factoryId,
        },
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        withCredentials: true,
      });
       
      if (reactAllocatedAssetScorpio.status == 201 || reactAllocatedAssetScorpio.status == 204) {
        setToastMessage("Allocated Asset Scorpio Updated");
      } else {
        setToastMessage("Allocated Asset Scorpio Not Updated");
      }
      
         const reactFlowScorpioUpdate = await axios.patch(
        `${API_URL}/shop-floor/update-react`,
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
      
      if (reactFlowScorpioUpdate.status == 201 || reactFlowScorpioUpdate.status == 204 ||  reactFlowScorpioUpdate.status == 200) {
        setToastMessage("Scorpio updated successfully");
      } else {
        setToastMessage("Data Already Exist in Scorpio");
      }
    
   
     
        setNodesInitialized(true);
        onRestore();
    } catch (error) {
      console.error("Error saving flowchart:", error);
      setToastMessage("Error saving flowchart");
    }
    finally {
    setIsOperationInProgress(false); 
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
      const reactFlowUpdateMongo = await axios.patch(
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

      const reactFlowScorpioUpdate = await axios.delete(
        `${API_URL}/shop-floor/delete-react`,
     
        {
          data: nodes, 
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          withCredentials: true,
          params: { "factory-id": factoryId },
        }
      );

      if (
        reactFlowUpdateMongo.status == 200 ||
        (reactFlowUpdateMongo.status == 204 && reactFlowScorpioUpdate.status == 204) ||
        reactFlowScorpioUpdate.status == 201
      ) {
        setToastMessage(
          "Selected elements and related data deleted successfully."
        );
      } else {
        setToastMessage("Partial deletion: Please check the data.");
      }
      onRestore();
    } catch (error) {
      console.error("Error deleting elements:", error);
      setToastMessage("Error deleting elements.");
    } finally {
      // Regardless of the result, try to refresh the state to reflect the current backend state
      setIsSaveDisabled(false);
      setIsOperationInProgress(false);
    }
  };

  const handleExportClick = () => {
    if (elementRef.current) {
      exportElementToJPEG(elementRef.current, "myElement.jpeg");
    }
  };

  const onElementClick: NodeMouseHandler  = useCallback((event, element
) => {
    if (element.type === "asset") {
      // Fetch asset details and set relations
      fetchAssetById(element.data.id)
        .then(() => {
       
          setSelectedAsset(element.id); 
       
        })
        .catch((error) =>
          console.error("Error fetching asset details:", error)
        );
    }
  }, []);

   const onConnect = useCallback(
     (params : Connection ) => {
     
      const { source, target} = params;

      console.log("params ", params)
      const sourceNode = nodes.find((node):node is ExtendedNode => node.id === source);

  
      const targetNode = nodes.find((node):node is ExtendedNode => node.id === target);

      if (!sourceNode || !targetNode) return;
      // Check if the source node is a relation and it already has an outgoing connection
     if (sourceNode.data.type === "relation" && sourceNode.data.class === "machine") {
      const alreadyHasChild = edges.some((edge) => edge.source === source);

        if (alreadyHasChild) {
          toast.current?.show({
            severity: "warn",
            summary: "Operation not allowed",
            detail: "A material relation can only connect to one asset.",
          });
          return;
        }
      }
      if (
        sourceNode.data.type === "shopFloor" &&
        targetNode.data.type === "asset"
      ) {
       
        setEdges((prevEdges) => addEdge(params, prevEdges)); // Add edge
      } else if (
        sourceNode.data.type === "asset" &&
        targetNode.data.type === "relation"
      ) {
        setNodes((nds) =>
          nds.map((node) =>
            node.id === target
              ? { ...node, data: { ...node.data } }
              : node
          )
        );

        setEdges((prevEdges) => addEdge(params , prevEdges)); // Add edge
      } else if (
        sourceNode.data.type === "relation" &&
        targetNode.data.type === "asset"
      ) {
       
       

        const newRelationNodeId = `${sourceNode.id}`;
        // access the asset_category and split it.
      const assetCategoryPart = targetNode.asset_category?.split(" ")[1] || "";
      const assetCategory = assetCategoryPart.toLowerCase();
      console.log("asset category", assetCategoryPart);

        // relation label is like "hasTracker_001", extract "Tracker" and normalize
        const relationType = sourceNode.data.label
          .split("_")[0]
          .replace("has", "")
          .toLowerCase();
        console.log(relationType, "relation type");
        // Check if the asset category === the relation type
        if (assetCategory  !== relationType) {
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
            return { ...edge, source: newRelationNodeId  };
          } else if (edge.target === sourceNode.id) {
            return { ...edge, target: newRelationNodeId };
          }
          return edge;
        });

        // Add a new edge for the current connection
        const newEdge = {
          id: `reactflow_edge-${newRelationNodeId}_${new Date().getTime()}`,
          source: newRelationNodeId,
          target: targetNode.id,
         
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


const performNavigation = () => {
  setIsDialogVisible(false); 

  console.log("nexturl", nextUrl)
  if (nextUrl) {
      setTimeout(async () => {
        await saveChanges(); 
        router.reload(); 
    }, 3000); 
    
    router.push(nextUrl);
  }
};

  useHotkeys(
    "backspace",
    (event) => {
      event.preventDefault(); 
      handleBackspacePress();
    },
    [handleBackspacePress]
  );

  const onNodeDoubleClick:NodeMouseHandler = useCallback(
    (event, node) => {
      console.log(node, "JKB");
      if (node.type === "shopFloor") {
    
      if (checkForNewAdditions() ) {
        
        setNextUrl("/factory-site/dashboard"); 
        setIsDialogVisible(true);
     
      } else {
      
        router.push("/factory-site/dashboard");
      }
    }
    },
    [isSaveDisabled, performNavigation,router]
  );

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (!reactFlowInstance || !reactFlowWrapper.current) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const data = event.dataTransfer.getData("application/json");

      try {
        const { item, type } = JSON.parse(data);

        console.log(
          "Parsed item:",
          item,

          "Type: ",
          type
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

            break;

          case "asset":
            const factoryNodeId = `${factory.id}`;
            // setSelectedNodeData(item);

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

            }

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
      setDroppedShopFloors,
    
    ]
  );

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onInit = useCallback((instance: ReactFlowInstance) => {
    setReactFlowInstance(instance);
  }, []);

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



 const saveChanges = async () => {
    if (isSaveDisabled) {
      console.log(
        "update called"
      )
      await onUpdate(); 
      
    } else {
        console.log(
        "onSave  called"
      )
      await onSave(); 
    
    }
    setIsDialogVisible(false); 
  
 
  };

  
const handleConfirm = async () => {
    setIsDialogVisible(false);
    await saveChanges();
    setHasChanges(false);

    setTimeout(() => {
        performNavigation();
    }, 3000); 
};

  const handleCancel = () => {
    setIsDialogVisible(false);
    setTimeout(() => {
        if (nextUrl) {
            router.push(nextUrl);
        } else {
            router.reload();
        }
        setHasChanges(false);
    }, 3000); 
};


console.log("formView here", formView);

 const dialogFooter = (
    <div>
      <Button label="No" icon="pi pi-times" onClick={handleCancel} className="p-button-text" />
      <Button label="Yes" icon="pi pi-check" onClick={handleConfirm} autoFocus />
    </div>
  );

  return (
    <>
     <Dialog header="Confirm" visible={isDialogVisible} onHide={() => setIsDialogVisible(false)} footer={dialogFooter}>
        Do you want to save changes before leaving?
      </Dialog>
      
    <ReactFlowProvider>
      <EdgeAddContext.Provider value={{ onEdgeAdd }}>
    
        <BlockUI blocked={isOperationInProgress} fullScreen/>
        <div className="flex justify-content-between">
          <div>
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
          </div>
         
          <div className="flex align-items-center gap-2">
            <span>Form View</span>
          <InputSwitch checked={formView} onChange={(e) => setFormView(e.value)} />
          </div>

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
            onNodeClick={onElementClick}
            nodeTypes={nodeTypes}
            deleteKeyCode={null}
          >
            <MiniMap />
            <Controls />
            <Background />
          </ReactFlow>
          {/* <BlockUI/> */}
        </div>
     
      </EdgeAddContext.Provider>

    </ReactFlowProvider></>   
  );
};

export default FlowEditor;
