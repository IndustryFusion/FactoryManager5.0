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

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  MouseEvent,
} from "react";
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
  Connection,
  NodeMouseHandler,
  NodeChange,
  EdgeChange,
} from "reactflow";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import "reactflow/dist/style.css";
import { Button } from "primereact/button";
import axios from "axios";
import { Toast } from "primereact/toast";
import {
  exportElementToJPEG,
  getAssetRelationById,
  relationToAssetCategory,
} from "@/utility/factory-site-utility";
import { Factory } from "../../types/factory-type";
import EdgeAddContext from "@/context/edge-add-context";
import CustomAssetNode from "@/components/reactFlow/custom-asset-node";
import { useShopFloor } from "@/context/shopfloor-context";
import { BlockUI } from "primereact/blockui";
import { useDispatch } from "react-redux";
import { reset } from "@/redux/unAllocatedAsset/unAllocatedAssetSlice";
import { InputSwitch } from "primereact/inputswitch";
import dagre from "@dagrejs/dagre";
import { Dialog } from "primereact/dialog";
import "../../styles/react-flow.css";
import { useTranslation } from "next-i18next";
import { Tooltip } from "primereact/tooltip";
import {
  FlowEditorProps,
  RelationCounts,
  ExtendedNodeData,
  Edge,
  ExtendedNode,
  FactoryNodeData,
} from "../../types/reactflow";
import {
  applyDagreLayout,
  getAllConnectedNodesBelow,
} from "../../utility/react-flow-utility";
import { HistoryState } from "next/dist/shared/lib/router/router";
import { handleUpdateRelations } from '@/utility/react-flow';
import CustomRelationNode from "./custom-relation-node";
import CustomFactoryNode from "./factory-node";
import CustomShopFloorNode from "./shop-floor-node";
interface RelationPayload {
  [key: string]: {
    [relationKey: string]: string[];
  };
}

const nodeTypes = {
  factory: CustomFactoryNode,
  shopFloor: CustomShopFloorNode, 
  asset: CustomAssetNode,
  relation: CustomRelationNode,
};

const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;
const FlowEditor: React.FC<
  FlowEditorProps & { deletedShopFloors: string[],  onOpenAssetsDialog?: (e: React.MouseEvent) => void;}
> = ({ factory, factoryId, deletedShopFloors,onOpenAssetsDialog   }) => {
  const [nodes, setNodes, onNodesChangeProvide] = useNodesState([]);
  const [edges, setEdges, onEdgesChangeProvide] = useEdgesState([]);
  const [selectedElements, setSelectedElements] =
    useState<OnSelectionChangeParams | null>(null);
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
  const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance | null>(null);
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
  const [selectedFactoryId, setSelectedFactoryId] = useState<string | null>(
    null
  );
  const { t } = useTranslation(["button", "reactflow"]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [expandedAssets, setExpandedAssets] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);
  const isUndoRedoAction = useRef(false);


   // Initialize history when nodes or edges are first loaded
  useEffect(() => {
    if (nodes.length > 0 || edges.length > 0) {
      if (history.length === 0) {
        setHistory([{ nodes: [...nodes], edges: [...edges] }]);
        setCurrentHistoryIndex(0);
      }
    }
  }, [nodes, edges]);
  // Function to add new state to history
const addToHistory = useCallback((newNodes: Node[], newEdges: Edge[]) => {
    if (isUndoRedoAction.current) {
      isUndoRedoAction.current = false;
      return;
    }

    const newState: HistoryState = {
      nodes: newNodes,
      edges: newEdges,
      timestamp: Date.now(),
      source: 'user'
    };

    setHistory(prevHistory => {
      // Remove any future states if we're not at the end of history
      const historySplice = prevHistory.slice(0, currentHistoryIndex + 1);
      return [...historySplice, newState];
    });

    setCurrentHistoryIndex(prevIndex => prevIndex + 1);
    setHasChanges(true);
  }, [currentHistoryIndex]);

  // Add this utility function to your component
const transformEdgesToRelationPayload = (edges: Edge[], nodes: Node[]): RelationPayload => {
  const payload: RelationPayload = {};
  
  edges.forEach(edge => {
    const sourceNode = nodes.find(node => node.id === edge.source);
    const targetNode = nodes.find(node => node.id === edge.target);
    
    // Handle asset -> relation edge
    if (sourceNode?.data?.type === "asset" && targetNode?.type === "relation") {
      const assetId = sourceNode.data.id;
      const relationType = targetNode.id.split('_')[1]; // e.g., "hasFilter" from "relation_hasFilter_001"
      
      if (!payload[assetId]) {
        payload[assetId] = {};
      }
      if (!payload[assetId][relationType]) {
        payload[assetId][relationType] = [];
      }
    }
    
    // Handle relation -> asset edge
    if (sourceNode?.type === "relation" && targetNode?.data?.type === "asset") {
      const relationType = sourceNode.id.split('_')[1];
      const targetAssetId = targetNode.data.id;
      
      // Find the asset that owns this relation
      const parentEdge = edges.find(e => e.target === sourceNode.id && 
        nodes.find(n => n.id === e.source)?.data?.type === "asset");
      
      if (parentEdge) {
        const parentNode = nodes.find(n => n.id === parentEdge.source);
        if (parentNode?.data?.id) {
          if (!payload[parentNode.data.id]) {
            payload[parentNode.data.id] = {};
          }
          if (!payload[parentNode.data.id][relationType]) {
            payload[parentNode.data.id][relationType] = [];
          }
          payload[parentNode.data.id][relationType].push(targetAssetId);
        }
      }
    }
  });
  
  return payload;
};
  // @desc : when in asset Node we get dropdown Relation then its creating relation node & connecting asset to hasRelation Edge
  const createRelationNodeAndEdge = (
    assetId: string,
    relationsInput: string | string[],
    relationClass: string,
    asset_category?: string
  ) => {
    const assetNode = nodes.find(n => n.id === selectedAsset);
    if (!assetNode) {
      console.error("Selected asset node not found");
      return;
    }

    const relations = Array.isArray(relationsInput) ? relationsInput : [relationsInput];

    const maxIndexByName = relations.reduce<Record<string, number>>((acc, name) => {
      const maxExisting = Math.max(
        0,
        ...nodes
          .filter(n => n.type === "relation" && n.id.startsWith(`relation_${name}_`))
          .map(n => parseInt(n.id.split("_").pop() || "0", 10))
      );
      acc[name] = maxExisting;
      return acc;
    }, {});
    const existingForThisAsset = nodes.filter(
      n => n.type === "relation" && n.data?.parentId === selectedAsset
    ).length;

    const newRelationNodes: Node[] = [];
    const newRelationEdges: Edge[] = [];

    relations.forEach((relationName, i) => {
      const count = (maxIndexByName[relationName] ?? 0) + 1 + i;
      const relationNodeId = `relation_${relationName}_${String(count).padStart(3, "0")}`;

      const x = assetNode.position.x + 200 + (existingForThisAsset + i) * 200;
      const y = assetNode.position.y + 200;

      newRelationNodes.push({
        id: relationNodeId,
        type: "relation",
        position: { x, y },                           // ✅ ensure position
        data: {
          label: `${relationName}_${String(count).padStart(3, "0")}`,
          type: "relation",
          class: relationClass,
          parentId: selectedAsset,
          asset_category,
        },
      });

      newRelationEdges.push({
        id: `reactflow__edge-${selectedAsset}-${relationNodeId}_${Date.now()}_${i}`,
        source: selectedAsset ?? "",
        type: "smoothstep",
        target: relationNodeId,
      });
    });


    setNodes(prev => {
      const merged = [...prev, ...newRelationNodes];
      const layouted = applyDagreLayout(merged, [...edges, ...newRelationEdges], false);
      return layouted;
    });

    setEdges(prev => newRelationEdges.reduce((acc, e) => addEdge(e, acc), prev));

    setRelationCounts(prev => {
      const next = { ...prev };
      relations.forEach((name) => {
        next[name] = Math.max(next[name] ?? 0, maxIndexByName[name] + relations.length);
      });
      return next;
    });
  };

  const createAssetNodeAndEdgeFromRelation = (
    relationNodeId: string,
    asset: { asset_serial_number: string; id: string; label: string; asset_category: string }
  ) => {
    const relationNode = nodes.find(n => n.id === relationNodeId);
    if (!relationNode) return;


    const currentChildCount =
      edges.filter(e => e.source === relationNodeId).length;

    const newAssetNodeId = `asset_${asset.id}_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;


    const provisionalPos = {
      x: relationNode.position.x + 220 * currentChildCount,
      y: relationNode.position.y + 150,
    };

    const newAssetNode: Node = {
      id: newAssetNodeId,
      type: "asset",
      position: provisionalPos,                 
      asset_category: asset.asset_category,
      data: {
        type: "asset",
        label: asset.label,
        id: asset.id,
        asset_category: asset.asset_category,
        asset_serial_number: asset.asset_serial_number,
      },
      style: { backgroundColor: "", border: "none", borderRadius: 10 },
    };

    const newEdge = {
      id: `reactflow__edge-${relationNodeId}-${newAssetNodeId}_${Date.now()}`,
      source: relationNodeId,
      target: newAssetNodeId,
      type: "smoothstep",
      animated: true,
    };


    setNodes(prevNodes => {
      const merged = [...prevNodes, newAssetNode];
      const layouted = applyDagreLayout(merged, [...edges, newEdge], false);
      return layouted;
    });


  setEdges(prevEdges => {
    const nextEdges = addEdge(newEdge, prevEdges);
    setNodes(prevNodes =>
      applyDagreLayout([...prevNodes, newAssetNode], nextEdges, false)
    );
    return nextEdges;
  });

    addToHistory([...nodes, newAssetNode], [...edges, newEdge]);
  };

  useEffect(() => {
    const originalWarn = console.warn;
    console.warn = (...args) => {
      const [message] = args;
      if (!/Node type "(factory|shopFloor|relation)" not found/.test(message)) {
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
        };

        setNodes((nds) => [...nds, newNode]);

        const newEdge = {
          id: `reactflow__edge-${factoryNodeId}-${shopFloorNodeId}_${new Date().getTime()}`,
          source: factoryNodeId,
          type: "smoothstep",
          target: shopFloorNodeId,
        };

        setEdges((eds) => [...eds, newEdge]);
      }
    }

    if (deletedShopFloors && deletedShopFloors.length > 0) {
      let nodesUpdated = false;

      deletedShopFloors.forEach((deletedShopFloorId) => {
        const shopFloorNodeId = `shopFloor_${deletedShopFloorId}`;

        setNodes((nodes) => {
          const updatedNodes = nodes.filter(
            (node) => node.id !== shopFloorNodeId
          );
          if (updatedNodes.length !== nodes.length) {
            nodesUpdated = true;
          }
          return updatedNodes;
        });

        setEdges((edges) =>
          edges.filter(
            (edge) =>
              edge.source !== shopFloorNodeId && edge.target !== shopFloorNodeId
          )
        );
      });

      if (nodesUpdated) {
        saveOrUpdate();
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
      getMongoDataFlowEditor();
      setLoadedFlowEditor(true);
    }
    if (toastMessage) {
      toast.current?.show({
        severity: "success",
        summary: toastMessage,
        life: 3000,
      });

      setToastMessage(null);
    }
    return () => {
      console.warn = originalWarn;
    };
  }, [latestShopFloor, reactFlowInstance, nodes, edges, deletedShopFloors]);

  const checkForNewAdditionsNodesEdges = useCallback(() => {
    const newNodesAdded =
      nodes.length > originalNodes.length ||
      nodes.length < originalNodes.length;
    const newEdgesAdded =
      edges.length > originalEdges.length ||
      edges.length < originalEdges.length;

    return newNodesAdded || newEdgesAdded;
  }, [nodes, edges, originalNodes, originalEdges]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChangeProvide(changes);
       const significantChanges = changes.some(
        change => change.type !== 'position' || change.dragging === false
      );
      
      if (significantChanges) {
        const newNodes = [...nodes];
        changes.forEach(change => {
          if (change.type === 'remove') {
            const index = newNodes.findIndex(node => node.id === change.id);
            if (index !== -1) {
              newNodes.splice(index, 1);
            }
          }
        });
        addToHistory(newNodes, edges);
      }
      
      if (isRestored && checkForNewAdditionsNodesEdges()) {
        setHasChanges(true);
      }
    },
    [onNodesChangeProvide,nodes, edges, isRestored,addToHistory, checkForNewAdditionsNodesEdges]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChangeProvide(changes);
      const newEdges = [...edges];
      changes.forEach(change => {
        if (change.type === 'remove') {
          const index = newEdges.findIndex(edge => edge.id === change.id);
          if (index !== -1) {
            newEdges.splice(index, 1);
          }
        }
      });
      addToHistory(nodes, newEdges);
    
      if (isRestored && checkForNewAdditionsNodesEdges()) {
        setHasChanges(true);
      }
    },
    [onEdgesChangeProvide, isRestored, nodes, edges, addToHistory,checkForNewAdditionsNodesEdges]
  );
 const handleUndo = useCallback(() => {
    if (currentHistoryIndex > 0) {
      isUndoRedoAction.current = true;
      const previousState = history[currentHistoryIndex - 1];
      
      // If we're undoing to the backend state, show a notification
      if (previousState.source === 'backend') {
        toast.current?.show({
          severity: 'info',
          summary: 'Initial State',
          detail: 'Returned to initial backend state',
          life: 3000,
        });
      }

      setNodes(previousState.nodes);
      setEdges(previousState.edges);
      setCurrentHistoryIndex(prevIndex => prevIndex - 1);
      setHasChanges(currentHistoryIndex > 1);
    }
  }, [history, currentHistoryIndex, setNodes, setEdges]);

  // Redo function
  const handleRedo = useCallback(() => {
    if (currentHistoryIndex < history.length - 1) {
      isUndoRedoAction.current = true;
      const nextState = history[currentHistoryIndex + 1];
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      setCurrentHistoryIndex(prevIndex => prevIndex + 1);
    }
  }, [history, currentHistoryIndex, setNodes, setEdges]);

  // Add keyboard shortcuts for undo/redo
  useHotkeys('ctrl+z', (event) => {
    event.preventDefault();
    handleUndo();
  }, [handleUndo]);

  useHotkeys('ctrl+shift+z', (event) => {
    event.preventDefault();
    handleRedo();
  }, [handleRedo]);
  // @desc:
  //@GET : the React Flow data for the specified factory ID both mongo
  const getMongoDataFlowEditor = useCallback(async () => {
  if (factoryId) {
    try {
      setIsOperationInProgress(true);

      const getReactFlowMongo = await axios.get(
        `${API_URL}/react-flow/${factoryId}`,
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          withCredentials: true,
        }
      );

      if (
        getReactFlowMongo.data &&
        getReactFlowMongo.data.factoryData?.nodes &&
        getReactFlowMongo.data.factoryData?.edges
      ) {
        // Remove duplicate nodes (especially factory nodes)
        const uniqueNodes = Array.from(
          new Map(
            getReactFlowMongo.data.factoryData.nodes.map(node => [node.id, node])
          ).values()
        );

        const dagreGraph = new dagre.graphlib.Graph();
        dagreGraph.setGraph({
          ranksep: 30,
          nodesep: 90,
        });
        dagreGraph.setDefaultEdgeLabel(() => ({}));

        // Add nodes to dagre graph
        uniqueNodes.forEach((node: Node) => {
          dagreGraph.setNode(node.id, { width: 150, height: 100 });
        });

        // Add edges to dagre graph
        getReactFlowMongo.data.factoryData.edges.forEach((edge: Edge) => {
          dagreGraph.setEdge(edge.source, edge.target);
        });

        // Run the layout
        dagre.layout(dagreGraph);

        // Get the positioned nodes
        const layoutedNodes = uniqueNodes.map((node: Node) => {
          const nodeWithPosition = dagreGraph.node(node.id);
          return {
            ...node,
            position: {
              x: nodeWithPosition.x,
              y: nodeWithPosition.y,
            },
            type: node.type || node.data?.type, // Ensure type is set correctly
            data: {
              ...node.data,
              type: node.type || node.data?.type, // Ensure type is in data as well
            }
          };
        });

        // Initialize history with backend data
        const initialState: HistoryState = {
          nodes: layoutedNodes,
          edges: getReactFlowMongo.data.factoryData.edges,
          timestamp: Date.now(),
          source: 'backend'
        };

        setHistory([initialState]);
        setCurrentHistoryIndex(0);

        // Set the states
        setNodes(layoutedNodes);
        setEdges(getReactFlowMongo.data.factoryData.edges);
        setOriginalNodes(layoutedNodes);
        setOriginalEdges(getReactFlowMongo.data.factoryData.edges);
        setIsRestored(true);

        // Handle relation counts
        const updatedRelationCounts: RelationCounts = {};
        layoutedNodes.forEach((node: Node) => {
          if (node.data?.type === "relation") {
            const match = node.id.match(/relation_(.+)_([0-9]+)/);
            if (match) {
              const [, relationName, count] = match;
              const numericCount = parseInt(count, 10);
              if (!updatedRelationCounts[relationName] || 
                  updatedRelationCounts[relationName] < numericCount) {
                updatedRelationCounts[relationName] = numericCount;
              }
            }
          }
        });
        setRelationCounts(updatedRelationCounts);
      }
    } catch (error) {
      console.error("Error fetching flowchart data:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error loading flowchart",
        detail: "Failed to load flowchart data",
        life: 3000,
      });
    } finally {
      setIsOperationInProgress(false);
    }
  }
}, [factoryId, setNodes, setEdges, setRelationCounts, toast]);

  // @desc:
  //@PATCH : the React Flow data for the specified factory ID ( both mongo and scorpio)
  const updateMongoAndScorpio = useCallback(async () => {
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

      if (reactFlowUpdateMongo.status == 200) {

      } else {
        toast.current?.show({
          severity: "warn",
          summary: "Flowchart not updated",
          life: 3000,
        });
      }
      const reactAllocatedAssetScorpio = await axios.patch(
        `${API_URL}/allocated-asset`,
        payLoad.factoryData.edges,
        {
          params: {
            "factory-id": factoryId,
          },
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          withCredentials: true,
        }
      );

      if (reactAllocatedAssetScorpio.status == 200) {

      } else {
        toast.current?.show({
          severity: "error",
          summary: "Alocated asset not updated",
          life: 3000,
        });
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
      if (reactFlowScorpioUpdate.status == 200) {

      } else {
        toast.current?.show({
          severity: "warn",
          summary: "Scorpio Not Updated",
          life: 3000,
        });
      }
      dispatch(reset());
    } catch (error) {
      console.error("Error saving flowchart:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error in Server",
        life: 3000,
      });
      //dispatch(reset());
    } finally {
      setIsOperationInProgress(false);
    }
  }, [nodes, edges, factoryId]);

  //@desc:
  //@POST : the React Flow data for the specified factory ID , both mongo and scorpio
  const saveMongoAndScorpio = useCallback(async () => {
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
    console.log("factoryData",payLoad)
    try {
      setIsOperationInProgress(true);
      const reactFlowUpdateMongo = await axios.post(
        `${API_URL}/react-flow`,
        payLoad,
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          withCredentials: true,
        }
      );
      console.log("reactFlowUpdateMongo",reactFlowUpdateMongo)
      if (reactFlowUpdateMongo.status == 201) {

      } else {
        toast.current?.show({
          severity: "warn",
          summary: "Flowchart Not created",
          life: 3000,
        });
      }

      const reactAllocatedAssetScorpio = await axios.post(
        API_URL + "/allocated-asset",
        payLoad.factoryData.edges,
        {
          params: {
            "factory-id": factoryId,
          },
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          withCredentials: true,
        }
      );


      if (reactAllocatedAssetScorpio.status == 201) {

      } else {
        toast.current?.show({
          severity: "warn",
          summary: "Allocated Asset not created",
          life: 3000,
        });
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
      if (reactFlowScorpioUpdate.status == 200) {

      } else {
        toast.current?.show({
          severity: "warn",
          summary: "Scorpio Not Updated",
          life: 3000,
        });
      }
    } catch (error) {
      console.error("Error saving flowchart:", error);
      toast.current?.show({
        severity: "error",
        summary: "Server Error : Not Saved",
        life: 3000,
      });
    } finally {
      setIsOperationInProgress(false);
    }
  }, [nodes, edges, factoryId]);

  //@desc :
  //@DELETE : the React Flow data for the specified factory ID, both mongo and scorpio(except Factory Node and ShopFloor Node)

  const deleteMongoAndScorpio = async () => {
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
        nodes: preservedNodes,
        edges: preservedEdges,
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

      const allocatedAssetDeletion = await axios.delete(
        `${API_URL}/allocated-asset`,
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          withCredentials: true,
          params: {
            id: `${factoryId}:allocated-assets`,
          },
        }
      );
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
      if (
        allocatedAssetDeletion.status == 200 &&
        reactFlowUpdateMongo.status == 200 &&
        reactFlowScorpioUpdate.status == 200
      ) {

      } else {
        toast.current?.show({
          severity: "warn",
          summary: "Not Updated Properly",
          life: 3000,
        });
      }
      dispatch(reset());
    } catch (error) {
      console.log(
        "Error from deleteMongoAndScorpio function @pages/factory-site/react-flow/flow-editor",
        error
      );
      toast.current?.show({
        severity: "error",
        summary: "Server Error : Not Updated",
        life: 3000,
      });
    } finally {
      setIsOperationInProgress(false);
    }
  };
  //@desc :
  //@GET : the React Flow data for the specified factory ID from scorpio and update react-flow mongo (nodes and/or edges)
  const refreshFromScorpio = async () => {
    const reactFlowUpdate = `${API_URL}/react-flow/${factoryId}`;
    try {
      setIsOperationInProgress(true); // Show a loading indicator or disable UI elements
      const response = await axios.get(reactFlowUpdate, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        withCredentials: true,
      });


      await getMongoDataFlowEditor();
    } catch (error) {
      console.error("Failed to update flowchart:", error);
      toast.current?.show({
        severity: "error",
        summary: "Failed to refresh flowchart",
        life: 3000,
      });
    } finally {
      setIsOperationInProgress(false); // Hide loading indicator or enable UI elements
    }
  };

  //@desc: helps to decide when to save or update data according to different reactflow scenarios
  //@POST/PATCH : POST/ PATCH react-flow data in mongo and in scorpio
  const saveOrUpdate = useCallback(async () => {
    console.log("nodes", nodes)
    console.log("edges",edges)
    try {
      setIsOperationInProgress(true);

      // Fetch the current state from the server to determine the nature of the flowchart
      const getReactFlowMongo = await axios.get(
        `${API_URL}/react-flow/${factoryId}`,
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          withCredentials: true,
        }
      );

      // Check if the response data exists and has the necessary elements
      const data = getReactFlowMongo.data;
      const isEmpty =
        !data || Object.keys(data).length === 0 || !data.factoryData;

           // Prepare the relation payload
      const relationPayload = transformEdgesToRelationPayload(edges, nodes);

    
      if (Object.keys(relationPayload).length > 0) {
        await handleUpdateRelations(relationPayload);
     }

      if (isEmpty) {
        await saveMongoAndScorpio();
      } else {
        // Check if edges only connect factory to shopFloor\\
        const onlyFactoryToShopFloor = data.factoryData.edges.every(
          (edge: Edge) =>
            edge.source.startsWith("factory_") &&
            edge.target.startsWith("shopFloor_")
        );
        const existingEdgesFactToShopFloor = edges.every(
          (edge: Edge) =>
            edge.source.startsWith("factory_") &&
            edge.target.startsWith("shopFloor_")
        );
        if (onlyFactoryToShopFloor || !existingEdgesFactToShopFloor) {
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
          console.log("  if (onlyFactoryToShopFloor || !existingEdgesFactToShopFloor) {")
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
          console.log("reactFlowUpdateMongo", payLoad)
          if (reactFlowUpdateMongo.status == 200) {

          } else {
            toast.current?.show({
              severity: "warn",
              summary: "Flowchart not updated",
              life: 3000,
            });
          }

          const allocatedAssetAvailableOrNot = await axios.get(
            `${API_URL}/allocated-asset/${factoryId}`,
            {
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              withCredentials: true,
            }
          );
          console.log("allocatedAssetAvailableOrNot",allocatedAssetAvailableOrNot)
          if (allocatedAssetAvailableOrNot.data.length == 0) {
            const reactAllocatedAssetScorpio = await axios.post(
              API_URL + "/allocated-asset",
              payLoad.factoryData.edges,
              {
                params: {
                  "factory-id": factoryId,
                },
                headers: {
                  "Content-Type": "application/json",
                  Accept: "application/json",
                },
                withCredentials: true,
              }
            );
            if (reactAllocatedAssetScorpio.status == 201) {

            } else {
              toast.current?.show({
                severity: "warn",
                summary: "Allocated Asset Not created",
                life: 3000,
              });
            }
          } else {
            const reactAllocatedAssetScorpio = await axios.patch(
              API_URL + "/allocated-asset",
              payLoad.factoryData.edges,
              {
                params: {
                  "factory-id": factoryId,
                },
                headers: {
                  "Content-Type": "application/json",
                  Accept: "application/json",
                },
                withCredentials: true,
              }
            );
            console.log("reactAllocatedAssetScorpio",reactAllocatedAssetScorpio)
            if (reactAllocatedAssetScorpio.status == 200) {
    
            } else {
              toast.current?.show({
                severity: "warn",
                summary: "Allocated Asset Scorpio Not Updated",
                life: 3000,
              });
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
          if (reactFlowScorpioUpdate.status == 200) {

          } else {
            toast.current?.show({
              severity: "warn",
              summary: "Scorpio Not Updated",
              life: 3000,
            });
          }
        } else {
          await updateMongoAndScorpio();
        }
      }
    } catch (error) {
      console.log(
        "Error from saveOrUpdate function @pages/factory-site/react-flow/flow-editor",
        error
      );
      toast.current?.show({
        severity: "error",
        summary: "Server Error",
        life: 3000,
      });
    } finally {
      setIsOperationInProgress(false);
    }
  }, [factoryId, saveMongoAndScorpio]);

  useEffect(() => {
    let isRouteChangeAllowed = true; // control navigation flow

    const handleRouteChange = async (url: string) => {
      if (hasChanges && isRouteChangeAllowed) {
        isRouteChangeAllowed = false; // Prevent further navigation attempts while saving
        try {
          await saveOrUpdate();
          // router.push(url);
        } catch (error) {
          toast.current?.show({
            severity: "error",
            summary: "Save Failed",
            detail: "Failed to save changes!",
          });
          console.error("Failed to save changes:", error);
        } finally {
          isRouteChangeAllowed = true; // Reset the navigation flag
        }
        return false; // Block navigation until save is complete
      }
      return true; // Allow navigation if no changes or after save
    };

    const routeChangeHandler = (url: string) => {
      if (!handleRouteChange(url)) {
        router.events.emit("routeChangeError");
        throw new Error("Route change aborted due to pending changes.");
      }
    };

    router.events.on("routeChangeStart", routeChangeHandler);

    return () => {
      router.events.off("routeChangeStart", routeChangeHandler);
    };
  }, [hasChanges, saveOrUpdate, router, toast]);

  const handleExportClick = () => {
    if (elementRef.current) {
      exportElementToJPEG(elementRef.current, "myElement.jpeg");
    }
  };



  const addAssetsToShopFloor = useCallback((
    shopFloorNodeId: string,
    assets: { id: string; label?: string; asset_category?: string; asset_serial_number?: string }[]
  ): string[] => {
    if (!assets?.length) return [];

    const sf = nodes.find(n => n.id === shopFloorNodeId);
    if (!sf) return [];

    const stamp = Date.now();


    const existingByAssetId = new Map<string, Node>(
      nodes
        .filter(n => (n as any)?.data?.type === "asset" && (n as any)?.data?.id)
        .map(n => [(n as any).data.id as string, n])
    );

    const edgeExists = (src: string, tgt: string) =>
      edges.some(e => e.source === src && e.target === tgt);

    const createdNodes: Node[] = [];
    const createdEdges: Edge[] = [];
    const focusIds: string[] = [];

    let childOffset = edges.filter(e => e.source === shopFloorNodeId).length;
    const baseX = sf.position?.x ?? 0;
    const baseY = sf.position?.y ?? 0;

    assets.forEach((a, idx) => {
      const existing = existingByAssetId.get(a.id);
      const nodeId = existing?.id ?? `asset_${a.id}_${stamp}_${idx}`;

      if (!existing) {
        createdNodes.push({
          id: nodeId,
          type: "asset",
          position: { x: baseX + 140 * childOffset, y: baseY + 150 },
          asset_category: a.asset_category,
          data: {
            type: "asset",
            id: a.id,
            label: a.label || "Asset",
            asset_category: a.asset_category,
            asset_serial_number: a.asset_serial_number,
          },
          style: { backgroundColor: "", border: "none", borderRadius: 10 },
        });
        childOffset++;
      }

      if (!edgeExists(shopFloorNodeId, nodeId)) {
        createdEdges.push({
          id: `reactflow__edge-${shopFloorNodeId}-${nodeId}_${stamp}_${idx}`,
          source: shopFloorNodeId,
          sourceHandle: "out",
          target: nodeId,
          targetHandle: "in",
          type: "smoothstep",
        });
      }

      focusIds.push(nodeId);
    });

    setNodes(prev =>
      applyDagreLayout([...prev, ...createdNodes], [...edges, ...createdEdges], false)
    );
    setEdges(prev => createdEdges.reduce((acc, e) => addEdge(e, acc), prev));
    addToHistory([...nodes, ...createdNodes], [...edges, ...createdEdges]);


    setTimeout(() => {
      reactFlowInstance?.fitView({
        nodes: focusIds.map(id => ({ id })),
        padding: 0.2,
        includeHiddenNodes: true,
      });
    }, 0);

    return focusIds;
  }, [nodes, edges, setNodes, setEdges, addToHistory, reactFlowInstance]);





const onElementClick: NodeMouseHandler = useCallback(
  (event, element) => {
    console.log("element",element)
    if (element.type === "asset" || element.type === "shopFloor") {
      const isAsset = element.type === "asset";
      const newExpandedState = isAsset
        ? new Set(expandedAssets)
        : new Set(expandedNodes);

      setSelectedAsset(element.id);

      if (newExpandedState.has(element.id)) {
        newExpandedState.delete(element.id);
      } else {
        newExpandedState.add(element.id);
      }

      if (isAsset) {
        setExpandedAssets(newExpandedState);
      } else {
        setExpandedNodes(newExpandedState);
      }

      const connectedNodeIds = getAllConnectedNodesBelow(
        element.id,
        nodes as [],
        edges as []
      );

      const newNodes = nodes.map((node) => {
        if (connectedNodeIds.has(node.id)) {
          return { ...node, hidden: !newExpandedState.has(element.id) };
        }
        return node;
      });

      const newEdges = edges.map((edge) => {
        if (
          connectedNodeIds.has(edge.source) ||
          connectedNodeIds.has(edge.target)
        ) {
          return { ...edge, hidden: !newExpandedState.has(element.id) };
        }
        return edge;
      });

      // Ensure unique edges to avoid duplicates
      const uniqueEdges = newEdges.filter(
        (edge, index, self) =>
          index ===
          self.findIndex(
            (e) => e.source === edge.source && e.target === edge.target
          )
      );

      const layoutedNodes = applyDagreLayout(
        newNodes as [],
        uniqueEdges as [],
        false
      );

      setNodes(layoutedNodes);
      setEdges(uniqueEdges);
    }
  },
  [edges, nodes, expandedNodes, expandedAssets, setNodes, setEdges]
);


  const connectEdgestoNode = useCallback(
    (params: Connection) => {
      const { source, target } = params;

      const sourceNode = nodes.find(
        (node): node is ExtendedNode => node.id === source
      );
      const targetNode = nodes.find(
        (node): node is ExtendedNode => node.id === target
      );
      //       if (sourceNode.asset_category.toLowerCase().includes("cartridge")) {
      //   sourceNode.data.class = "machine";
      //   console.log("Classified as machine:", sourceNode);
      // }
      if (sourceNode?.data.type === "relation") {
        const relationClass = sourceNode.data.class;

          if (relationClass === "machine") {
            const existingConnections = edges.filter((e) => e.source === sourceNode.id);
            if (existingConnections.length >= 1) {
              toast.current?.show({
                severity: "warn",
                summary: "Operation not allowed",
                detail: "Machine relation can only connect to one asset.",
              });
              return;
            } 
        }
      }
      if (!sourceNode || !targetNode) return;
      // Check if the source node is a relation and it already has an outgoing connection
      if (
        sourceNode.data.type === "relation" &&
        (sourceNode.id.includes("relation_hasCutter") ||
          sourceNode.id.includes("relation_hasFilter") ||
          sourceNode.id.includes("relation_hasTracker") ||
          sourceNode.id.includes("relation_hasSource"))
      ) {
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
            node.id === target ? { ...node, data: { ...node.data } } : node
          )
        );

        setEdges((prevEdges) => addEdge(params, prevEdges)); // Add edge
      } else if (
        sourceNode.data.type === "relation" &&
        targetNode.data.type === "asset"
      ) {
        const newRelationNodeId = `${sourceNode.id}`;
        // access the asset_category and split it.
        const assetCategoryPart =
          targetNode.asset_category?.split(" ")[1] || "";
        const assetCategory = assetCategoryPart.toLowerCase();

        // relation label is like "hasTracker_001", extract "Tracker" and normalize
        const relationType = sourceNode.data.label
          .split("_")[0]
          .replace("has", "")
          .toLowerCase();

        // Check if the asset category === the relation type
        if (assetCategory !== relationType) {
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
          type: "smoothstep",
          target: targetNode.id,

          animated: true,
        };

        setNodes(updatedNodes);
        setEdges([...updatedEdges, newEdge]);
        const newEdges = [...edges, newEdge];
        addToHistory(nodes, newEdges);
      } else if (
        sourceNode.data.type === "factory" &&
        targetNode.data.type === "shopFloor"
      ) {
        setEdges((prevEdges) => addEdge(params, prevEdges)); // Add edge
      } else {
        if (toast) {
          toast.current?.show({
            severity: "error",
            summary: "Connection not allowed",
            detail: "Invalid connection type.",
          });
        }
      }
    },
    [nodes, setNodes, setEdges, toast,addToHistory]
  );

  //@desc : on backspace button press we delete edges or nodes(expect:  factory to shopFloor edges and shopFloor/factory nodes )
const handleBackspacePress = useCallback(() => {
  if (!selectedElements || (!selectedElements.nodes?.length && !selectedElements.edges?.length)) {
    toast.current?.show({
      severity: "warn",
      summary: "No selection",
      detail: "Please select an edge or node to delete.",
      life: 3000,
    });
    return;
  }

  const { nodeIdsToDelete, edgeIdsToDelete } = buildCascadeDeletion(
    selectedElements,
    nodes,
    edges
  );

  if (!nodeIdsToDelete.size && !edgeIdsToDelete.size) {
    toast.current?.show({
      severity: "info",
      summary: "Nothing to delete",
      life: 2000,
    });
    return;
  }

  const newNodes = nodes.filter((n) => !nodeIdsToDelete.has(n.id));
  const newEdges = edges.filter((e) => !edgeIdsToDelete.has(e.id));

  setNodes(newNodes);
  setEdges(newEdges);
  addToHistory(newNodes, newEdges);

  setSelectedElements(null);


  toast.current?.show({
    severity: "success",
    summary: "Deleted",
    detail: `Removed ${edgeIdsToDelete.size} edge(s) and ${nodeIdsToDelete.size} node(s).`,
    life: 2000,
  });
}, [selectedElements, nodes, edges, setNodes, setEdges, addToHistory, toast]);

  useHotkeys(
    "backspace",
    (event) => {
      event.preventDefault();
      handleBackspacePress();
    },
    [handleBackspacePress]
  );

  //@desc : 1) on shopFloor node double click navigate to dashboard
  //        2) on factory node double click show dialog
  const onNodeDoubleClick: NodeMouseHandler = useCallback(
   
    async (event, node) => {
      if (node.type == "factory") {
        const cleanedFactoryId = node.id.replace("factory_", "");
        setSelectedFactoryId(cleanedFactoryId);
        setDialogVisible(true);
      }
      console.log("node data",node)
      // if (node.type === "shopFloor") {
      //     if (hasChanges) {
      //         // Save or update changes before navigating if there are any changes
      //         await saveOrUpdate();
      //     }
      //     // Navigate to the dashboard after handling the save or update
      //     router.push("/factory-site/dashboard");
      // }
    },
    [hasChanges, saveOrUpdate, router] // Include all dependencies used in the callback
  );

  //@desc : drag and drop asset from unallocated-allocated-asset.tsx component

  const assetNodeDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (!reactFlowInstance || !reactFlowWrapper.current) return;

      const data = event.dataTransfer.getData("application/json");

      try {
        const { item, type } = JSON.parse(data);

        const position = reactFlowInstance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        const idPrefix = `${type}_${item.id}`;

        let label = item.product_name || item.floorName || `Unnamed ${type}`;

        switch (type) {
          case "shopFloor":
            const shopFloorNode = {
              id: idPrefix,
              type: "shopFloor",
              position,
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
                  asset_category:item.asset_category,
                  asset_serial_number:item.asset_serial_number
                },
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
    [reactFlowInstance, setNodes]
  );

  //@desc : Drag Event for Asset/ shopFloor nodes

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  //@desc :  set react flow instance
  const onInit = useCallback((instance: ReactFlowInstance) => {
    setReactFlowInstance(instance);
  }, []);
  const onEdgeClick = useCallback((_, __) => {
    setNodes(prev =>
      prev.map(n => {
        if (n.style?.outline || n.style?.outlineOffset) {
          const { outline, outlineOffset, ...rest } = n.style as any;
          return { ...n, style: rest };
        }
        return n;
      })
    );
  }, [setNodes]);



  const getNodeType = (node: any) => (node?.type ?? node?.data?.type) as string | undefined;


  const buildCascadeDeletion = (
    selection: OnSelectionChangeParams | null,
    nodesArr: Node[],
    edgesArr: Edge[]
  ) => {
    const nodeById = new Map(nodesArr.map((n) => [n.id, n]));
    const nodeIdsToDelete = new Set<string>();
    const edgeIdsToDelete = new Set<string>();

    const selectedEdges = selection?.edges ?? [];
    const selectedNodes = selection?.nodes ?? [];


    selectedEdges.forEach((e) => {
      edgeIdsToDelete.add(e.id);
    });


    selectedNodes.forEach((n) => {
      const nType = getNodeType(n);
      if (nType === "factory" || nType === "shopFloor") return; // protected
      nodeIdsToDelete.add(n.id);
    });


    edgesArr.forEach((e) => {
      if (nodeIdsToDelete.has(e.source) || nodeIdsToDelete.has(e.target)) {
        edgeIdsToDelete.add(e.id);
      }
    });


    for (const id of Array.from(nodeIdsToDelete)) {
      const n = nodeById.get(id);
      const nType = n ? getNodeType(n) : undefined;
      if (nType === "factory" || nType === "shopFloor") {
        nodeIdsToDelete.delete(id);
      }
    }

    return { nodeIdsToDelete, edgeIdsToDelete };
  };


  return (
    <>
      <Toast ref={toast} />
      <ReactFlowProvider>
        <Dialog
          header="Factory Details"
          visible={dialogVisible}
          onHide={() => setDialogVisible(false)}
          style={{ width: "50vw" }}
          className="dialog-class"
        >
          <hr style={{ margin: "0" }} />
          <p>
            <span className="bold-text">Factory ID: </span>{" "}
            <span>{selectedFactoryId}</span>
          </p>
        </Dialog>

        <EdgeAddContext.Provider value={{ createRelationNodeAndEdge,createAssetNodeAndEdgeFromRelation ,addAssetsToShopFloor,setNodes, setEdges}}>
          <BlockUI blocked={isOperationInProgress} fullScreen />

     

          <div
            ref={reactFlowWrapper}
            style={{ height: "100%", width: "100%" }}
            onDrop={assetNodeDrop}
            onDragOver={onDragOver}
          >
            <ReactFlow
              nodesDraggable={true}
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={connectEdgestoNode}
              onInit={onInit}
              onNodeDoubleClick={onNodeDoubleClick}
              onSelectionChange={onSelectionChange}
              fitView
              ref={elementRef}
              onNodeClick={onElementClick}
              onEdgeClick={onEdgeClick}
              nodeTypes={nodeTypes}
              deleteKeyCode={null}
            >
              <MiniMap />
              <Controls />
              <Background />
              
            </ReactFlow>
           <div className="rf-toolbar">
              <Tooltip target=".rf-tip" position="top" showDelay={150} hideDelay={0} />

              <span className="rf-tip" data-pr-tooltip="Create flow">
                <Button
                  aria-label="Create flow"
                  className="rf-btn"
                  onClick={(e) => onOpenAssetsDialog?.(e)}
                >
                  <img src="/factory-flow-buttons/create-flow-icon.svg" alt="" />
                </Button>
              </span>

              <span className="rf-tip" data-pr-tooltip="Undo (Ctrl+Z)">
                <Button
                  aria-label="Undo"
                  className="rf-btn"
                  onClick={handleUndo}
                  disabled={currentHistoryIndex <= 0}
                >
                  <img src="/factory-flow-buttons/undo-03.svg" alt="" />
                </Button>
              </span>

              <span className="rf-tip" data-pr-tooltip="Redo (Ctrl+Shift+Z)">
                <Button
                  aria-label="Redo"
                  className="rf-btn"
                  onClick={handleRedo}
                  disabled={currentHistoryIndex >= history.length - 1}
                >
                  <img src="/factory-flow-buttons/redo.svg" alt="" />
                </Button>
              </span>

              <span className="rf-tip" data-pr-tooltip="Save">
                <Button aria-label="Save" className="rf-btn" onClick={saveOrUpdate}>
                  <img src="/factory-flow-buttons/file-icon.svg" alt="" />
                </Button>
              </span>

              <span className="rf-tip" data-pr-tooltip="Refresh">
                <Button aria-label="Refresh" className="rf-btn" onClick={refreshFromScorpio}>
                  <img src="/factory-flow-buttons/refresh-icon.svg" alt="" />
                </Button>
              </span>

              <span className="rf-tip" data-pr-tooltip="Reset">
                <Button aria-label="Reset" className="rf-btn" onClick={deleteMongoAndScorpio}>
                  <img src="/factory-flow-buttons/erase-icon.svg" alt=""  />
                </Button>
              </span>

              <span className="rf-tip" data-pr-tooltip="Export JPEG">
                <Button aria-label="Export JPEG" className="rf-btn" onClick={handleExportClick}>
                  <img src="/factory-flow-buttons/image-icon.svg" alt=""/>
                </Button>
              </span>
            </div>


              {/* <div className="flex align-items-center gap-2 mt-2">
              <span>{t("reactflow:switchView")}</span>
              <InputSwitch
                checked={switchView}
                onChange={(e) => {
                  setSwitchView(e.value);
                  saveOrUpdate();
                  router.push(`/factory-site/factory-shopfloor/${factoryId}`);
                }}
              />
            </div> */}
          <Toast ref={toast} />
          </div>
        </EdgeAddContext.Provider>
      </ReactFlowProvider>
    </>
  );
};

export default FlowEditor;
