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

import axios from "axios";
import dagre from "@dagrejs/dagre";

import { Edge, ExtendedNode } from "../types/reactflow";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

export const fetchFlowData = async (factoryId: string) => {
  try {
    const response = await axios.get(`${API_URL}/react-flow/${factoryId}`, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching flowchart data:", error);
    throw error;
  }
};

export const saveFlowData = async (payload: any) => {
  try {
    const response = await axios.post(`${API_URL}/react-flow`, payload, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      withCredentials: true,
    });
    return response.status;
  } catch (error) {
    console.error("Error saving flowchart:", error);
    throw error;
  }
};

export const updateFlowData = async (factoryId: string, payload: any) => {
  try {
    const response = await axios.patch(
      `${API_URL}/react-flow/${factoryId}`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        withCredentials: true,
      }
    );
    return response.status;
  } catch (error) {
    console.error("Error updating flowchart:", error);
    throw error;
  }
};

export const applyDagreLayout = (
  nodes: ExtendedNode[],
  edges: Edge[],
  isHorizontal: boolean
) => {
  const visibleNodes = nodes.filter((node) => !node.hidden);
  const visibleEdges = edges.filter((edge) => !edge.hidden);

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setGraph({
    rankdir: isHorizontal ? "LR" : "TB",
    ranksep: 50,
    nodesep: 90,
  });
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  visibleNodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 100, height: 100 });
  });

  visibleEdges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    if (node.hidden) {
      return node;
    }
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: { x: nodeWithPosition.x, y: nodeWithPosition.y },
    };
  });

  return layoutedNodes;
};

export const getAllConnectedNodesBelow = (
  nodeId: string,
  nodes: ExtendedNode[],
  edges: Edge[]
) => {
  const connectedNodes = new Set<string>();
  const stack = [nodeId];

  while (stack.length > 0) {
    const currentNodeId = stack.pop();
    edges.forEach((edge) => {
      if (edge.source === currentNodeId && !connectedNodes.has(edge.target)) {
        stack.push(edge.target);
        connectedNodes.add(edge.target);
      }
    });
  }

  return connectedNodes;
};
