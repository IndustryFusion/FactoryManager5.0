import React, { useState, useEffect, useRef, useCallback, MouseEvent } from "react";
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
  Connection, NodeMouseHandler
} from "reactflow";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import "reactflow/dist/style.css";
import { Button } from "primereact/button";
import axios from "axios";
import { Toast } from "primereact/toast";
import {
  exportElementToJPEG,
  fetchAssetById,
} from "@/utility/factory-site-utility";
import { Factory } from "@/interfaces/factory-type";
import EdgeAddContext from "@/context/edge-add-context";
import CustomAssetNode from "@/components/custom-asset-node";
import { useShopFloor } from "@/context/shopfloor-context";
import { BlockUI } from "primereact/blockui";
import { useDispatch } from "react-redux";
import { reset } from "@/state/unAllocatedAsset/unAllocatedAssetSlice";
import { InputSwitch } from "primereact/inputswitch";
import dagre from '@dagrejs/dagre';
import { Dialog } from "primereact/dialog";
import "../../../styles/react-flow.css"
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
  asset_category?:string
}
interface Edge {
  source: string;
  target: string;
  // include other properties that edges might have
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
    parentId?:string,
  },
  asset_category?: string


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
  const onSelectionChange = useCallback(
    (params: OnSelectionChangeParams | null) => {
      setSelectedElements(params);
    },
    []
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toast = useRef<Toast>(null);
  const router = useRouter();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const elementRef = useRef(null);

  const [loadedFlowEditor, setLoadedFlowEditor] = useState(false);
  const [relationCounts, setRelationCounts] = useState<Record<string, number>>(
    {}
  );
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const { latestShopFloor } = useShopFloor();
  const [hasChanges, setHasChanges] = useState(false);
  const [isRestored, setIsRestored] = useState(false);
  const [originalNodes, setOriginalNodes] = useState([]);
  const [originalEdges, setOriginalEdges] = useState([]);
  const [isOperationInProgress, setIsOperationInProgress] = useState(false);
  const [switchView, setSwitchView] = useState(false);
  const dispatch = useDispatch();
  const [dialogVisible, setDialogVisible] = useState(false);
  const [selectedFactoryId, setSelectedFactoryId] = useState<string | null>(null);

  // @desc : when in asset Node we get dropdown Relation then its creating relation node & connecting asset to hasRelation Edge
  const onEdgeAdd = (assetId: string, relationsInput: string, relationClass: string) => {
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
          class: relationClass,
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
        const gapX = 200; // Horizontal gap between shopFloor nodes
        const startY = factoryNode.position.y + 127; // Y position below the factory node

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
    if (factory && reactFlowInstance && !loadedFlowEditor) {
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

  }, [latestShopFloor, reactFlowInstance, nodes, setNodes, setEdges, deletedShopFloors, factoryId, API_URL, toastMessage]);


useEffect(() => {
  if (deletedShopFloors && deletedShopFloors.length > 0) {
    console.log("Processing deletions for: ", deletedShopFloors);

    const newNodes = nodes.filter(node => 
      !deletedShopFloors.includes(node.id.replace('shopFloor_', ''))
    );
    const newEdges = edges.filter(edge => 
      !deletedShopFloors.includes(edge.source.replace('shopFloor_', '')) &&
      !deletedShopFloors.includes(edge.target.replace('shopFloor_', ''))
    );

    if (newNodes.length !== nodes.length || newEdges.length !== edges.length) {
      setNodes(newNodes);
      setEdges(newEdges);
    }

   saveOrUpdate();
  //  onRestore();
  }
}, [deletedShopFloors]); 


  const checkForNewAdditions = useCallback(() => {
    const newNodesAdded = nodes.length > originalNodes.length || nodes.length < originalNodes.length;
    const newEdgesAdded = edges.length > originalEdges.length || edges.length < originalEdges.length;

    return newNodesAdded || newEdgesAdded;
  }, [nodes, edges, originalNodes, originalEdges]);


  const onNodesChange = useCallback((changes: any) => {
    onNodesChangeProvide(changes);
    if (isRestored && checkForNewAdditions()) {
      setHasChanges(true);
    }
  }, [onNodesChangeProvide, isRestored, checkForNewAdditions]);

  const onEdgesChange = useCallback((changes: any) => {
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
        const dagreGraph = new dagre.graphlib.Graph();
        dagreGraph.setGraph({
          ranksep: 30,    // vertical spacing between nodes
          nodesep: 90      // horizontal spacing between nodes
        });
        dagreGraph.setDefaultEdgeLabel(() => ({}));

        // Add nodes to the dagre graph
        getReactFlowMongo.data.factoryData.nodes.forEach((node:Node) => {
          dagreGraph.setNode(node.id, { width: 100, height: 100 });
        });

        // Add edges to the dagre graph
        getReactFlowMongo.data.factoryData.edges.forEach((edge:Edge) => {
          dagreGraph.setEdge(edge.source, edge.target);
        });

        // Auto layout the nodes using dagre
        dagre.layout(dagreGraph);

        const layoutedNodes = getReactFlowMongo.data.factoryData.nodes.map((node:Node) => {
          const nodeWithPosition = dagreGraph.node(node.id);
          return {
            ...node,
            position: { x: nodeWithPosition.x, y: nodeWithPosition.y }
          };
        });

     
        setNodes(layoutedNodes);
        setEdges(getReactFlowMongo.data.factoryData.edges);

        setOriginalNodes(layoutedNodes);
        setOriginalEdges(getReactFlowMongo.data.factoryData.edges);

        setIsRestored(true);
        const updatedRelationCounts: RelationCounts = {};

        layoutedNodes.forEach((node: Node) => {
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

        setRelationCounts(updatedRelationCounts);
      } else {
        console.log("Invalid data received from backend");
      }
    } catch (error) {
      console.error("Error fetching flowchart data:", error);
    } finally {
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
      const reactAllocatedAssetScorpio = await axios.patch(`${API_URL}/allocated-asset`,
        payLoad.factoryData.edges, {
        params: {
          "factory-id": factoryId,
        },
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        withCredentials: true,
      });
    
      if (reactAllocatedAssetScorpio.status == 200 || reactAllocatedAssetScorpio.status == 204 || reactAllocatedAssetScorpio.status == 201 || reactAllocatedAssetScorpio.data.status == 404) {
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
      if (reactFlowScorpioUpdate.status == 200 || reactFlowScorpioUpdate.status == 204) {
        setToastMessage("Scorpio updated successfully");
      } else {
        setToastMessage("Scorpio already has these data");
      }
     dispatch(reset());

    } catch (error) {
      console.error("Error saving flowchart:", error);
      setToastMessage("");
        dispatch(reset());
    }
    finally {
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
      if (reactFlowUpdateMongo.status == 201) {
        setToastMessage("Flowchart saved successfully");
      } else {
        setToastMessage("Flowchart already exist");
      }
  
      const reactAllocatedAssetScorpio = await axios.post(API_URL + '/allocated-asset',
        payLoad.factoryData.edges, {
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
      dispatch(reset());
      if (reactFlowScorpioUpdate.status == 201 || reactFlowScorpioUpdate.status == 204 || reactFlowScorpioUpdate.status == 200) {
        setToastMessage("Scorpio updated successfully");
      } else {
        setToastMessage("Data Already Exist in Scorpio");
      }
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
    const payLoad = {
      factoryId: factoryId,
      factoryData: {
      nodes:preservedNodes,
      edges:preservedEdges
      },
    };

    try {
      const reactFlowUpdateMongo = await axios.patch(
        `${API_URL}/react-flow/${factoryId}`,
        payLoad,
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          withCredentials: true,
        }
      );
      const allocatedAssetDeletion = await axios.delete(`${API_URL}/allocated-asset`,{
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        withCredentials: true,
        params:{
          "id": `${factoryId}:allocated-assets`
        }
        
      });
      const reactFlowScorpioUpdate =  await axios.patch(
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

    
     
      if (reactFlowUpdateMongo.data.status == 200 ||  reactFlowUpdateMongo.data.status == 204) {
        setToastMessage("Flowchart saved successfully");
      }

      if (reactFlowScorpioUpdate.data.status == 200 ||  reactFlowScorpioUpdate.data.status == 204) {
        setToastMessage( "Scorpio updated successfully.");
      }

      if (allocatedAssetDeletion.data.status == 200 ||  allocatedAssetDeletion.data.status == 204) {
        setToastMessage( "Allocated Asset Deleted successfully.");
      }
      dispatch(reset());
    } catch (error) {
      console.log("Error deleting elements:", error);
      setToastMessage("Error deleting elements.");
    } finally {
      setIsOperationInProgress(false);
   
    }
  };
 const refreshFromScorpio = async () => {
  const reactFlowUpdate = `${API_URL}/react-flow/react-flow-update/${factoryId}`;
  try {
    setIsOperationInProgress(true);  // Show a loading indicator or disable UI elements
    const response = await axios.get(reactFlowUpdate, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      withCredentials: true,
    });

    setToastMessage('Refresh Completed');
    await onRestore(); 
  } catch (error) {
    console.error('Failed to update flowchart:', error);
    setToastMessage('Error updating flowchart.');
  } finally {
    setIsOperationInProgress(false);  // Hide loading indicator or enable UI elements
  }
};

  const saveOrUpdate = useCallback(async () => {
  try {
    setIsOperationInProgress(true);

    // Fetch the current state from the server to determine the nature of the flowchart
    const response = await axios.get(`${API_URL}/react-flow/${factoryId}`, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      withCredentials: true,
    });
  //  console.log(response, "lll")
    // Check if the response data exists and has the necessary elements
    const data = response.data;
    const isEmpty = !data || Object.keys(data).length === 0 || !data.factoryData;

   
    // const existingMongoEdges = data?.factoryData.edges.every((edge:Edge) => edge.source.startsWith("factory_") && edge.target.startsWith("shopFloor_"));
    if (isEmpty) {
      await onSave();
    } else {
      // Check if edges only connect factory to shopFloor\\
      const onlyFactoryToShopFloor = data.factoryData.edges.every((edge:Edge) => 
        edge.source.startsWith("factory_") && edge.target.startsWith("shopFloor_")
      );
      const existingEdgesFactToShopFloor = edges.every((edge:Edge) => edge.source.startsWith("factory_") && edge.target.startsWith("shopFloor_"));
      if (onlyFactoryToShopFloor ||!existingEdgesFactToShopFloor) {
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
        await axios.patch(`${API_URL}/react-flow/${factoryId}`, payLoad,{
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          withCredentials: true,
        });
        setToastMessage("Flowchart updated successfully.");
         const allocatedAssetAvailableOrNot = await axios.get(`${API_URL}/allocated-asset/${factoryId}`,  {
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              withCredentials: true,
            });
        if(allocatedAssetAvailableOrNot.data.length==0){
          const reactAllocatedAssetScorpio = await axios.post(API_URL + '/allocated-asset',
                  payLoad.factoryData.edges, {
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
        }
        else{
           const reactAllocatedAssetScorpio = await axios.patch(API_URL + '/allocated-asset',
              payLoad.factoryData.edges, {
              params: {
                "factory-id": factoryId,
              },
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              withCredentials: true,
            });
             if (reactAllocatedAssetScorpio.status == 200 || reactAllocatedAssetScorpio.status == 204) {
                setToastMessage("Allocated Asset Scorpio Updated");
              } else {
                setToastMessage("Allocated Asset Scorpio Not Updated");
              }
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
        dispatch(reset());
      if (reactFlowScorpioUpdate.status == 201 || reactFlowScorpioUpdate.status == 204 || reactFlowScorpioUpdate.status == 200) {
        setToastMessage("Scorpio updated successfully");
      } else {
        setToastMessage("Data Already Exist in Scorpio");
      }
    
      } else {
        await onUpdate();
      
      }
    }
  } catch (error) {
    console.log("Error during save or update operation:", error);
    setToastMessage("Error during operation, check the logs for details");
  } finally {
    setIsOperationInProgress(false);
  }
}, [factoryId, onSave]);

  useEffect(() => {
  let isRouteChangeAllowed = true; // control navigation flow

  const handleRouteChange = async (url:string) => {
    if (hasChanges && isRouteChangeAllowed) {
      isRouteChangeAllowed = false; // Prevent further navigation attempts while saving
      try {
        await saveOrUpdate(); 
        router.push(url); 
      } catch (error) {
        toast.current?.show({
          severity: 'error',
          summary: 'Save Failed',
          detail: 'Failed to save changes!'
        });
        console.error('Failed to save changes:', error);
      } finally {
        isRouteChangeAllowed = true; // Reset the navigation flag
      }
      return false; // Block navigation until save is complete
    }
    return true; // Allow navigation if no changes or after save
  };

  const routeChangeHandler = (url:string) => {
    if (!handleRouteChange(url)) {
      router.events.emit('routeChangeError');
      throw new Error('Route change aborted due to pending changes.');
    }
  };

  router.events.on('routeChangeStart', routeChangeHandler);

  return () => {
    router.events.off('routeChangeStart', routeChangeHandler);
  };
}, [hasChanges, saveOrUpdate, router, toast]);



const handleExportClick = () => {
    if (elementRef.current) {
      exportElementToJPEG(elementRef.current, "myElement.jpeg");
    }
  };

  const onElementClick: NodeMouseHandler = useCallback((event, element
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
    (params: Connection) => {

      const { source, target } = params;

      console.log("params ", params)
      const sourceNode = nodes.find((node): node is ExtendedNode => node.id === source);
      const targetNode = nodes.find((node):node is ExtendedNode => node.id === target);
//       if (sourceNode.asset_category.toLowerCase().includes("cartridge")) {
//   sourceNode.data.class = "machine";
//   console.log("Classified as machine:", sourceNode);
// }
//before logic :   if (sourceNode.data.type === "relation" && sourceNode.data.class === "machine") {

      if (!sourceNode || !targetNode) return;
      // Check if the source node is a relation and it already has an outgoing connection
     if (sourceNode.data.type === "relation" && (
      
        sourceNode.id.includes("relation_hasCutter") ||
        sourceNode.id.includes("relation_hasFilter") ||
        sourceNode.id.includes("relation_hasTracker") ||
        sourceNode.id.includes("relation_hasSource")
    )) {
      const alreadyHasChild = edges.some((edge) => edge.source === source);
        if (alreadyHasChild) {
          toast.current?.show({
            severity: "warn",
            summary: "Operation not allowed",
            detail: "A machine relation can only connect to one asset.",
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

        setEdges((prevEdges) => addEdge(params, prevEdges)); // Add edge
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
        if (assetCategory !== relationType) {
          toast.current?.show({
            severity: "warn",
            summary: "Connection not allowed",
            detail: `Assets of category '${targetNode.asset_category
              }' can only connect to 'has${assetCategory.charAt(0).toUpperCase() + assetCategory.slice(1)
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
            return { ...edge, source: newRelationNodeId };
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
    [nodes, setNodes, setEdges, toast]
  );


 const handleBackspacePress = useCallback(() => {
  if (!selectedElements || (!selectedElements.nodes && !selectedElements.edges)) {
    toast.current?.show({
      severity: "warn",
      summary: "No selection",
      detail: "Please select an edge or node to delete.",
      life: 3000,
    });
    return;
  }

  // Initialize deletable edge IDs
  let edgeIdsToDelete: string[] = [];

  // Filter edges that are not connecting a factory to a shopFloor
  if (selectedElements.edges) {
    edgeIdsToDelete = selectedElements.edges
      .filter(edge => {
        const sourceNode = nodes.find(node => node.id === edge.source);
        const targetNode = nodes.find(node => node.id === edge.target);
        return !(sourceNode?.data.type === "factory" && targetNode?.data.type === "shopFloor");
      })
      .map(edge => edge.id);
  }

  // Exclude the factory and shopFloor nodes from deletion
  const containsNonDeletableNodes = selectedElements.nodes?.some(
    (node: Node<any>) => node.data.type === "factory" || node.data.type === "shopFloor"
  );

  if (containsNonDeletableNodes) {
    toast.current?.show({
      severity: "warn",
      summary: "Deletion Not Allowed",
      detail: "Cannot delete factory or shopFloor nodes.",
      life: 3000,
    });
    return;
  }

  // Collect IDs of nodes to delete
  const nodeIdsToDelete = new Set<string>(
    selectedElements.nodes?.map(node => node.id) ?? []
  );

  // Update nodes and edges state
  const updatedNodes = nodes.filter(node => !nodeIdsToDelete.has(node.id));
  const updatedEdges = edges.filter(edge => !edgeIdsToDelete.includes(edge.id));

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
      event.preventDefault();
      handleBackspacePress();
    },
    [handleBackspacePress]
  );
const onNodeDoubleClick: NodeMouseHandler = useCallback(
    async (event, node) => {
        console.log(node, "Node double-clicked");
        if (node.type == "factory") {
           const cleanedFactoryId = node.id.replace("factory_", "");
            setSelectedFactoryId(cleanedFactoryId);
            setDialogVisible(true);
          }

        if (node.type === "shopFloor") {
            if (hasChanges) {
                // Save or update changes before navigating if there are any changes
                await saveOrUpdate();
            }
            // Navigate to the dashboard after handling the save or update
            router.push("/factory-site/dashboard");
        }
    },
    [hasChanges, saveOrUpdate, router] // Include all dependencies used in the callback
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
    ]
  );

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onInit = useCallback((instance: ReactFlowInstance) => {
    setReactFlowInstance(instance);
  }, []);

  return (
    <>
      <ReactFlowProvider>
        <Dialog header="Factory Details" visible={dialogVisible} onHide={() => setDialogVisible(false)} style={{ width: '50vw' }}>
          <hr style={{ margin: '0' }} />
          <p>
            <span className="bold-text">Factory ID:  </span> <span>{selectedFactoryId}</span>
          </p>
       </Dialog>

        <EdgeAddContext.Provider value={{ onEdgeAdd }}>
          <BlockUI blocked={isOperationInProgress} fullScreen />
          
          <div className="flex justify-content-between">
            <div>
              <Button
                label="Save / Update"
                onClick={saveOrUpdate}
                className="m-2"
                raised
              />
              <Button
                label="Undo"
                onClick={onRestore}
                className="p-button-secondary m-2"
                raised
              />
               <Button
                label="Refresh"
                onClick={refreshFromScorpio}
                className="m-2"
                severity="help"
                raised
              />
              <Button
                label="Reset"
                onClick={handleDelete}
                className="p-button-danger m-2"
                raised
              />
              <Button
                label="Export as JPEG"
                className="m-2"
                onClick={handleExportClick}
                  severity="info"
              />
            </div>
            <div className="flex align-items-center gap-2">
              <span>Switch View</span>
              <InputSwitch checked={switchView} onChange={(e) => {
                setSwitchView(e.value);
                saveOrUpdate();
                router.push(`/factory-site/factory-shopfloor/${factoryId}`)
              }} />
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
