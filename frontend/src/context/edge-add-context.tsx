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

import React from "react";
import { Node, Edge } from "reactflow";
export type SubFlowKind = "productLine" | "workcell";

export type SubFlowType = Node<{ label: string }> & {
  type?: "subflow";
  isSubflowContainer: true;
  subflowId: string | null;
  kind: SubFlowKind;
};
export type CreateRelationNodeAndEdgeFn = (
  assetId: string,
  relationName: string,
  relationClass?: string,
  asset_category?:string,
  asset_serial_number?:string,
  relationship_type?:string
) => void;
export type CreateSubflowForShopFloorFn = (shopFloorNodeId: string) => void;
export type CreateAssetNodeAndEdgeFromRelationFn = (
  relationNodeId: string,
  asset: { id: string; label: string; asset_category: string ,asset_serial_number:string}
) => void;
export type CreateSubflowFromAssetNodeFn = (
  assetNodeIdOrEntityId: string,
  opts?: {
    kind?: SubFlowKind;                   
    label?: string;                       
    position?: { x: number; y: number }; 
    parentSubflowId?: string | null;     
  }
) => void;
export interface EdgeAddContextType {
  createRelationNodeAndEdge: CreateRelationNodeAndEdgeFn;
  createAssetNodeAndEdgeFromRelation: CreateAssetNodeAndEdgeFromRelationFn;
  addAssetsToShopFloor: AddAssetsToShopFloorFn;
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  createGroupAtNode?: (nodeIdOrEntityId: string) => void;
  createSubflowForShopFloor?: CreateSubflowForShopFloorFn;
  createSubflowFromAssetNode?: CreateSubflowFromAssetNodeFn;
}

export type AddAssetsToShopFloorFn = (
  shopFloorNodeId: string,
  assets: { id: string; label?: string; asset_category?: string; asset_serial_number?: string }[]
) => string[];


const EdgeAddContext = React.createContext<EdgeAddContextType>({
  createRelationNodeAndEdge: () => {},
  createAssetNodeAndEdgeFromRelation: () => {},
  addAssetsToShopFloor: () => [],
  setNodes: () => {},
  setEdges: () => {},
  createGroupAtNode: () => {},
  createSubflowForShopFloor: () => {},
  createSubflowFromAssetNode: () => {},
});

export default EdgeAddContext;
