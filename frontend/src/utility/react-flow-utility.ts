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


const nodeTypeOf = (n: any) => (n?.type ?? n?.data?.type) as string | undefined;
const sizeOf = (n: any) => {
  const isRelation = nodeTypeOf(n) === "relation";
  const w = n.width ?? (isRelation ? 120 : 160);
  const h = n.height ?? (isRelation ? 40 : 80);
  return { w, h };
};


function nudgeSingleRelationLeft(nodes: Node[], edges: Edge[], gapX = 220, gapY = 150) {
  const byId = new Map(nodes.map(n => [n.id, n]));

  const relChildrenByAsset = new Map<string, string[]>();

  edges.forEach(e => {
    const s = byId.get(e.source);
    const t = byId.get(e.target);
    if (nodeTypeOf(s) === "asset" && nodeTypeOf(t) === "relation") {
      const list = relChildrenByAsset.get(s.id) ?? [];
      list.push(t.id);
      relChildrenByAsset.set(s.id, list);
    }
  });

  const out = nodes.map(n => ({ ...n }));
  for (const [assetId, relationIds] of relChildrenByAsset) {
    if (relationIds.length !== 1) continue;           
    const asset = byId.get(assetId);
    const relId = relationIds[0];
    const idx = out.findIndex(n => n.id === relId);
    if (asset && idx !== -1) {
      const { w: relW } = sizeOf(out[idx]);
      const ax = asset.position?.x ?? 0;
      const ay = asset.position?.y ?? 0;

      out[idx].position = {
        x: ax - (gapX + relW),                        
        y: ay + gapY,                                
      };
    }
  }
  return out;
}

export const applyDagreLayout = (
  nodes: ExtendedNode[],
  edges: Edge[],
  isHorizontal: boolean
) => {
  const visibleNodes = nodes.filter(n => !n.hidden);
  const visibleEdges = edges.filter(e => !e.hidden);

  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: isHorizontal ? "LR" : "TB", ranksep: 50, nodesep: 90 });
  g.setDefaultEdgeLabel(() => ({}));

  visibleNodes.forEach(n => {
    const { w, h } = sizeOf(n);
    g.setNode(n.id, { width: w, height: h });
  });
  visibleEdges.forEach(e => g.setEdge(e.source, e.target));

  dagre.layout(g);

  let layouted = nodes.map(n => {
    if (n.hidden) return n;
    const p = g.node(n.id);
    if (!p) return n;
    const { w, h } = sizeOf(n);
    return { ...n, position: { x: p.x - w / 2, y: p.y - h / 2 } };
  });


  layouted = nudgeSingleRelationLeft(layouted, edges, 220, 150);

  return layouted;
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
