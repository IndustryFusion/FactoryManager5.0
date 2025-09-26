import axios from "axios";
import dagre from "@dagrejs/dagre";
import type { Node, Edge } from "reactflow";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL

export const handleUpdateRelations = async (payload: Payload) => {
    const url = `${API_URL}/asset/update-relation`;
    try {
        const response = await axios.patch(url, payload, {
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            withCredentials: true,
        })

        if (response.data?.status === 204 && response.data?.success === true) {
            if (deleteRelation) {

                showToast("success", "success", "Relation deleted successfully");
            } else {
                showToast("success", "success", "Relations saved successfully");
            }

        }
    }catch (error) {
        if (axios.isAxiosError(error)) {
            console.error("Error response:", error.response?.data.message);
        showToast('error', 'Error', "Updating relations");
        } 
    }
}







export type RFNode = Node;
export type RFEdge = Edge;

export const isSubflowNode     = (n?: RFNode) => !!n && (n.type === "subflow"  || (n.data as any)?.type === "subflow");
export const isAssetNode       = (n?: RFNode) => !!n && (n.type === "asset"    || (n.data as any)?.type === "asset");
export const isRelationNode    = (n?: RFNode) => !!n && (n.type === "relation" || (n.data as any)?.type === "relation");
export const isShopFloorNode   = (n?: RFNode) => !!n && (n.type === "shopFloor"|| (n.data as any)?.type === "shopFloor");
export const isWrappedInSubflow = (id: string) => id.startsWith("subflow_");

export const restoreRelationId = (wrappedId: string) => {
  let base = wrappedId;
  if (base.startsWith("subflow_")) base = base.slice("subflow_".length);
  return base.replace(/__subflow_.+$/, "");
};

export const getNodeSize = (n?: RFNode) => {
  if (!n) return { w: 150, h: 80 };
  const w = (n as any).width ?? (n.style as any)?.width ?? (n.type === "subflow" ? 420 : 150);
  const h = (n as any).height ?? (n.style as any)?.height ?? (n.type === "subflow" ? 260 : 80);
  return { w: Number(w), h: Number(h) };
};

export const getAbsPos = (n: RFNode, byId: Map<string, RFNode>) => {
  let x = n.position.x, y = n.position.y;
  let pid = (n as any).parentNode as string | undefined;
  while (pid) {
    const p = byId.get(pid);
    if (!p) break;
    x += p.position.x; y += p.position.y;
    pid = (p as any).parentNode as string | undefined;
  }
  return { x, y };
};

export const createsParentCycle = (childId: string, parentId: string, byId: Map<string, RFNode>) => {
  if (!parentId || childId === parentId) return childId === parentId;
  let cur: string | undefined = parentId;
  const seen = new Set<string>([childId]);
  while (cur) {
    if (seen.has(cur)) return true;
    seen.add(cur);
    const n = byId.get(cur);
    if (!n) return false;
    cur = (n as any).parentNode as string | undefined;
  }
  return false;
};

export const sanitizeParenting = (list: RFNode[]) => {
  const byId = new Map(list.map(n => [n.id, n]));
  return list.map(n => {
    const p = (n as any).parentNode as string | undefined;
    if (!p) return n;
    if (!byId.has(p) || p === n.id || createsParentCycle(n.id, p, byId)) {
      const { parentNode, extent, ...rest } = n as any;
      return { ...n, parentNode: undefined, extent: undefined };
    }
    return n;
  });
};

export const isDescendant = (maybeDescendantId: string, maybeAncestorId: string, byId: Map<string, RFNode>) => {
  let cur: string | undefined = (byId.get(maybeDescendantId) as any)?.parentNode;
  while (cur) { if (cur === maybeAncestorId) return true; cur = (byId.get(cur) as any)?.parentNode; }
  return false;
};

export const isInAnySubflow = (n: RFNode, byId: Map<string, RFNode>) => {
  const pid = (n as any)?.parentNode as string | undefined;
  if (!pid) return false;
  const parent = byId.get(pid);
  return !!parent && isSubflowNode(parent);
};

export const urnFromSubflowContainerId = (subflowId: string) => {
  if (!subflowId.startsWith("subflow_")) return subflowId;
  const core = subflowId.slice("subflow_".length);
  const last = core.lastIndexOf("_");
  if (last < 0) return core;
  const secondLast = core.lastIndexOf("_", last - 1);
  if (secondLast < 0) return core.slice(0, last);
  return core.slice(0, secondLast);
};

export const productionLineFromContainer = (containerId: string, nodes: RFNode[]) => {
  const urn = urnFromSubflowContainerId(containerId);
  const anchor = nodes.find(n => isAssetNode(n) && (n.data as any)?.id === urn && (n.data as any)?.isSubflowContainer);
  const pl = (anchor?.data as any)?.subFlowId;
  return typeof pl === "string" && pl.startsWith("production_line_") ? pl : null;
};

export const findSubflowContainerForAsset = (assetNode: RFNode, nodes: RFNode[]) => {
  // parent chain
  const parentId = (assetNode as any)?.parentNode as string | undefined;
  if (parentId) {
    const parent = nodes.find(n => n.id === parentId);
    if (isSubflowNode(parent)) return parent!;
  }
  // existing container made for same entity
  const eid = (assetNode.data as any)?.id as string | undefined;
  return eid ? nodes.find(n => isSubflowNode(n) && (n.data as any)?.id === eid) ?? null : null;
};

export const getNearestContainerId = (node: RFNode, nodes: RFNode[]) => {
  const pid = (node as any)?.parentNode as string | undefined;
  if (pid) {
    const parent = nodes.find(n => n.id === pid);
    if (parent && (isSubflowNode(parent) || isShopFloorNode(parent))) return pid;
  }
  // fall back: shopfloor parent by incoming edge (caller can pass resolver)
  return null;
};

export const buildAnchorSubgraph = (anchorId: string, nodes: RFNode[], edges: RFEdge[]) => {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const seen = new Set<string>([anchorId]);
  const queue: string[] = [anchorId];
  const subNodes = new Set<string>();
  const subEdges: RFEdge[] = [];

  while (queue.length) {
    const cur = queue.shift()!;
    if (cur !== anchorId) subNodes.add(cur);
    const outs = edges.filter(e => e.source === cur);
    for (const e of outs) {
      const tgt = byId.get(e.target); if (!tgt) continue;
      if (isInAnySubflow(tgt, byId)) continue; // respect boundaries
      subEdges.push(e);
      if (!seen.has(e.target)) { seen.add(e.target); queue.push(e.target); }
    }
  }

  const childNodes = Array.from(subNodes).map(id => byId.get(id)!).filter(n => n && (isRelationNode(n) || isAssetNode(n)));
  const childNodeIdSet = new Set([anchorId, ...childNodes.map(n => n.id)]);
  const childEdges = subEdges.filter(e => childNodeIdSet.has(e.source) && childNodeIdSet.has(e.target));

  return { childNodes, childEdges };
};

/** ——— optional: dagre for subgraph (if you really want auto layout) ——— */
export const dagreLayoutSubgraph = (nodesIn: RFNode[], edgesIn: RFEdge[], rankdir: "TB" | "LR" = "TB") => {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir, ranksep: 40, nodesep: 30, edgesep: 10, marginx: 0, marginy: 0 });
  g.setDefaultEdgeLabel(() => ({}));
  nodesIn.forEach(n => { const { w, h } = getNodeSize(n); g.setNode(n.id, { width: w, height: h }); });
  edgesIn.forEach(e => g.setEdge(e.source, e.target));
  dagre.layout(g);
  const positions = new Map<string, { x: number; y: number }>();
  nodesIn.forEach(n => { const d = g.node(n.id); positions.set(n.id, { x: d.x, y: d.y }); });
  return positions;
};

export const measureBBoxFromPositions = (nodesIn: RFNode[], pos: Map<string, { x: number; y: number }>) => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  nodesIn.forEach(n => {
    const p = pos.get(n.id); if (!p) return;
    const { w, h } = getNodeSize(n);
    const left = p.x - w / 2, top = p.y - h / 2, right = p.x + w / 2, bottom = p.y + h / 2;
    minX = Math.min(minX, left); minY = Math.min(minY, top);
    maxX = Math.max(maxX, right); maxY = Math.max(maxY, bottom);
  });
  if (!isFinite(minX)) return { minX: 0, minY: 0, width: 0, height: 0, maxX: 0, maxY: 0 };
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
};

export const measureBBoxFromAbsolute = (nodesIn: RFNode[], nodesAll: RFNode[]) => {
  const byId = new Map(nodesAll.map(n => [n.id, n]));
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  nodesIn.forEach(n => {
    const abs = getAbsPos(n, byId); const { w, h } = getNodeSize(n);
    const left = abs.x, top = abs.y, right = abs.x + w, bottom = abs.y + h;
    minX = Math.min(minX, left); minY = Math.min(minY, top);
    maxX = Math.max(maxX, right); maxY = Math.max(maxY, bottom);
  });
  if (!isFinite(minX)) return { minX: 0, minY: 0, width: 0, height: 0, maxX: 0, maxY: 0 };
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
};

/** Lift children when deleting a subflow container */
export const liftSubflowChildren = (containerId: string, nodes: RFNode[], edges: RFEdge[]) => {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const container = byId.get(containerId);
  if (!container) return { nodes, edges };

  const parentId = (container as any).parentNode as string | undefined;
  const parentAbs = parentId ? getAbsPos(byId.get(parentId)!, byId) : { x: 0, y: 0 };
  const isDesc = (nid: string) => isDescendant(nid, containerId, byId);
  const descendants = nodes.filter(n => n.id !== containerId && isDesc(n.id));

  const usedIds = new Set(nodes.map(n => n.id).filter(id => id !== containerId));
  const idRemap = new Map<string, string>();
  const freshAssetId = (n: RFNode) => {
    const urn = (n.data as any)?.id || "unknown";
    let cand = `asset_${urn}_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
    if (usedIds.has(cand)) cand += `_${Math.random().toString(36).slice(2,4)}`;
    return cand;
  };

  descendants.forEach(n => {
    if (isAssetNode(n) && n.id.startsWith("subflow_")) {
      const wanted = (n.data as any)?.__preSubflowId as string | undefined;
      const next = wanted && !usedIds.has(wanted) ? wanted : freshAssetId(n);
      idRemap.set(n.id, next); usedIds.add(next);
    }
  });

  let liftedNodes = nodes
    .filter(n => n.id !== containerId)
    .map(orig => {
      if (!descendants.includes(orig)) return orig;
      const oldId = orig.id;
      const newId = idRemap.get(oldId) ?? oldId;
      const abs = getAbsPos(orig, byId);
      const rel = { x: abs.x - parentAbs.x, y: abs.y - parentAbs.y };
      const d: any = orig.data || {};
      const { __preSubflowId, __preSubflowParent, __preSubflowExtent, ...restData } = d;
      return {
        ...orig,
        id: newId,
        parentNode: parentId ?? undefined,
        extent: parentId ? "parent" : undefined,
        position: rel,
        data: { ...restData, subFlowId: null, isSubflowContainer: false },
      } as RFNode;
    });

  const anchorUrn = urnFromSubflowContainerId(containerId);
  liftedNodes = liftedNodes.map(n =>
    isAssetNode(n) && (n.data as any)?.id === anchorUrn && (n.data as any)?.isSubflowContainer === true
      ? { ...n, data: { ...(n.data as any), subFlowId: null, isSubflowContainer: false } }
      : n
  );

  const liftedEdges = edges
    .filter(e => e.source !== containerId && e.target !== containerId)
    .map(e => ({ ...e, source: idRemap.get(e.source) ?? e.source, target: idRemap.get(e.target) ?? e.target }));

  return { nodes: sanitizeParenting(liftedNodes), edges: liftedEdges };
};

/** Create a subflow around an anchor + its downstream children. */
export function createSubflowAroundAnchor(args: {
  anchor: RFNode;
  nodes: RFNode[];
  edges: RFEdge[];
  getShopFloorParentId?: (assetNodeId: string) => string | null;
  useDagre?: boolean;             // default false = keep current positions
  autoPlaceBelow?: boolean;       // default true = below current bbox bottom
  padding?: number;               // content padding inside subflow
  headerH?: number;               // header height inside subflow
  minW?: number; minH?: number;   // container min size
}) {
  const {
    anchor, nodes, edges, getShopFloorParentId,
    useDagre = false, autoPlaceBelow = true,
    padding = 16, headerH = 28, minW = 420, minH = 260,
  } = args;

  const byId = new Map(nodes.map(n => [n.id, n]));
  const { childNodes, childEdges } = buildAnchorSubgraph(anchor.id, nodes, edges);
  const group = [anchor, ...childNodes];

  // compute container size/placement
  let subW = minW, subH = minH, subflowPosAbs = { x: 0, y: 0 };

  if (useDagre) {
    const pos = dagreLayoutSubgraph(group, childEdges, "TB");
    const bbox = measureBBoxFromPositions(group, pos);
    const innerW = bbox.width + padding * 2;
    const innerH = bbox.height + padding * 2 + headerH;
    subW = Math.max(minW, Math.ceil(innerW));
    subH = Math.max(minH, Math.ceil(innerH));
    // center under anchor
    const anchorAbs = getAbsPos(anchor, byId);
    const anchorRelNodes = edges
      .filter(e => e.source === anchor.id)
      .map(e => nodes.find(n => n.id === e.target))
      .filter(isRelationNode) as RFNode[];
    const bottoms = anchorRelNodes.map(r => {
      const a = getAbsPos(r, byId); const { h } = getNodeSize(r);
      return a.y + h;
    });
    const lowest = bottoms.length ? Math.max(...bottoms) : (anchorAbs.y + getNodeSize(anchor).h);
    subflowPosAbs = autoPlaceBelow ? { x: anchorAbs.x - subW / 2, y: lowest + 48 } : { x: bbox.minX - padding, y: bbox.minY - headerH - padding };
  } else {
    // wrap-in-place: measure from current absolute positions
    const bboxAbs = measureBBoxFromAbsolute(group, nodes);
    subW = Math.max(minW, Math.ceil(bboxAbs.width + padding * 2));
    subH = Math.max(minH, Math.ceil(bboxAbs.height + padding * 2 + headerH));
    subflowPosAbs = { x: bboxAbs.minX - padding, y: autoPlaceBelow ? (bboxAbs.maxY + 48) : (bboxAbs.minY - headerH - padding) };
  }

  const parentContainerId =
    getNearestContainerId(anchor, nodes) ??
    getShopFloorParentId?.(anchor.id) ??
    null;

  const parentAbs = parentContainerId
    ? getAbsPos(nodes.find(n => n.id === parentContainerId)!, byId)
    : { x: 0, y: 0 };

  const subflowPos = { x: subflowPosAbs.x - parentAbs.x, y: subflowPosAbs.y - parentAbs.y };

  const subflowNodeId = `subflow_${(anchor.data as any)?.id}_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
  const productionLineId = `production_line_${Date.now()}_${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;

  const subflowNode: RFNode = {
    id: subflowNodeId,
    type: "subflow",
    position: subflowPos,
    data: {
      type: "subflow",
      label: (anchor.data as any)?.label ?? "Subflow",
      id: (anchor.data as any)?.id,
      asset_category: (anchor.data as any)?.asset_category,
      asset_serial_number: (anchor.data as any)?.asset_serial_number,
      subFlowId: parentContainerId,
      isSubflowContainer: true,
    },
    style: { border: "none", borderRadius: 10, width: subW, height: subH, zIndex: 0 },
    width: subW, height: subH,
    ...(parentContainerId ? { parentNode: parentContainerId, extent: "parent" as const } : {}),
    draggable: true,
  };

  // id remap for nodes going inside
  const idRemap: Record<string, string> = {};
  const makeChildId = (n: RFNode) => {
    const kind = (n.data as any)?.type ?? n.type;
    if (n.id === anchor.id) {
      const wanted = `subflow_${(anchor.data as any)?.id}`;
      return nodes.some(x => x.id === wanted) ? `${wanted}__${subflowNodeId}` : wanted;
    }
    if (kind === "asset") {
      const eid = (n.data as any)?.id as string | undefined;
      const wanted = `subflow_${eid ?? n.id}`;
      return nodes.some(x => x.id === wanted) ? `${wanted}__${subflowNodeId}` : wanted;
    }
    const wanted = `subflow_${n.id}`;
    return nodes.some(x => x.id === wanted) ? `${wanted}__${subflowNodeId}` : wanted;
  };

  const byIdAgain = new Map(nodes.map(n => [n.id, n]));
  const movedNodes = group.map(n => {
    const newId = makeChildId(n); idRemap[n.id] = newId;
    const abs = useDagre
      ? (() => {
          const pos = dagreLayoutSubgraph(group, childEdges, "TB").get(n.id)!;
          const { w, h } = getNodeSize(n);
          return { x: pos.x - w / 2, y: pos.y - h / 2 };
        })()
      : getAbsPos(n, byIdAgain);

    const { w, h } = getNodeSize(n);
    const relX = useDagre ? Math.max(padding, Math.round(abs.x - (subflowPosAbs.x) + padding)) : Math.max(padding, Math.round(abs.x - subflowPosAbs.x + padding));
    const relY = useDagre ? Math.max(headerH + padding, Math.round(abs.y - (subflowPosAbs.y) + headerH + padding)) : Math.max(headerH + padding, Math.round(abs.y - subflowPosAbs.y + headerH + padding));

    const isAnchor = n.id === anchor.id;
    const baseData = (n.data as any) ?? {};
    const nextData = {
      ...baseData,
      __preSubflowId: n.id,
      __preSubflowParent: (n as any).parentNode ?? null,
      __preSubflowExtent: (n as any).extent ?? undefined,
      subFlowId: productionLineId,
      isSubflowContainer: isAnchor,
    };

    return {
      ...n,
      id: newId,
      parentNode: subflowNodeId,
      extent: "parent",
      position: { x: relX, y: relY },
      width: w, height: h,
      style: { border: "none", borderRadius: 10, ...(n.style || {}) },
      data: nextData,
    } as RFNode;
  });

  const movedOldIds = new Set(group.map(n => n.id));
  const updatedEdges = edges.map(e => ({
    ...e,
    source: idRemap[e.source] ?? e.source,
    target: idRemap[e.target] ?? e.target,
  }));

  const updatedNodes = nodes.filter(n => !movedOldIds.has(n.id)).concat(subflowNode, ...movedNodes);
  return {
    nodes: sanitizeParenting(updatedNodes),
    edges: updatedEdges,
    subflowId: subflowNodeId,
  };
}



export type LayoutSubflowOpts = {
  padding?: number;  
  headerH?: number;   
  minW?: number;    
  minH?: number;     
  rankdir?: "TB" | "LR";
};


export const layoutSubflow = (
  subflowId: string,
  nodes: RFNode[],
  edges: RFEdge[],
  opts: LayoutSubflowOpts = {}
): RFNode[] => {
  const {
    padding = 16,
    headerH = 28,
    minW = 420,
    minH = 260,
    rankdir = "TB",
  } = opts;

  const children = nodes.filter(n => (n as any).parentNode === subflowId);
  if (!children.length) return nodes;

  // Build dagre graph for child nodes only
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir, ranksep: 40, nodesep: 30, edgesep: 10 });
  g.setDefaultEdgeLabel(() => ({}));

  children.forEach(n => {
    const { w, h } = getNodeSize(n);
    g.setNode(n.id, { width: w, height: h });
  });

  const childIds = new Set(children.map(n => n.id));
  edges.forEach(e => {
    if (childIds.has(e.source) && childIds.has(e.target)) {
      g.setEdge(e.source, e.target);
    }
  });

  dagre.layout(g);

  // Compute bbox in dagre coordinates
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  children.forEach(n => {
    const d = g.node(n.id);
    if (!d) return;
    const left = d.x - d.width / 2;
    const top  = d.y - d.height / 2;
    const right = d.x + d.width / 2;
    const bottom = d.y + d.height / 2;
    minX = Math.min(minX, left);
    minY = Math.min(minY, top);
    maxX = Math.max(maxX, right);
    maxY = Math.max(maxY, bottom);
  });

  if (!isFinite(minX)) return nodes;

  // Place children inside the subflow with padding & header
  const placed = nodes.map(n => {
    if (!childIds.has(n.id)) return n;
    const d = g.node(n.id);
    const x = (d.x - d.width / 2) - minX + padding;
    const y = (d.y - d.height / 2) - minY + padding + headerH;
    return { ...n, position: { x, y } };
  });

  // Resize the subflow container to fit content
  const innerW = (maxX - minX) + padding * 2;
  const innerH = (maxY - minY) + padding * 2 + headerH;
  const width  = Math.max(minW, Math.ceil(innerW));
  const height = Math.max(minH, Math.ceil(innerH));

  return placed.map(n => {
    if (n.id !== subflowId) return n;
    return {
      ...n,
      width,
      height,
      style: { ...(n.style || {}), width, height },
    };
  });
};
