import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Handle, Position, NodeProps, useReactFlow } from "reactflow";
import { FactoryNodeData } from "@/types/reactflow";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { useRouter } from "next/router";
import "../../styles/react-flow.css";
import "../../styles/custom-asset-node.css";
import { fetchAllShopFloors } from "@/utility/factory-site-utility";
import CreateShopFloor from "@/components/shopFloorForms/create-shop-floor-form";
import { useShopFloor } from "@/context/shopfloor-context";
import { getAccessGroup } from '@/utility/indexed-db';
import { useTranslation } from 'next-i18next';

type AreaOption = { label: string; value: string };
type Floor = { id: string; floorName: string; type_of_floor: string };

const CustomFactoryNode: React.FC<NodeProps<FactoryNodeData>> = ({
  id: factoryNodeId,
  data,
  selected,
  xPos,
  yPos,
}) => {

  const router = useRouter();
  const { latestShopFloor } = useShopFloor();
  const { getNodes, getEdges, setNodes, setEdges, fitView } = useReactFlow();

  const factoryIdValue = useMemo(() => {
    const q = (router.query?.factoryId || router.query?.id) as string | undefined;
    if (q) return decodeURIComponent(q);
    const m = router.asPath?.match(/factory-management\/([^/?#]+)/);
    return m ? decodeURIComponent(m[1]) : undefined;
  }, [router.query, router.asPath]);

  const [areasVisible, setAreasVisible] = useState(false);
  const [areaOptions, setAreaOptions] = useState<AreaOption[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateVisible, setIsCreateVisible] = useState(false);
  const [accessgroupIndexDb, setAccessgroupIndexedDb] = useState<any>(null);
  const { t } = useTranslation(['overview',"reactflow"]);

  const loadFloors = useCallback(async () => {
    if (!factoryIdValue) return;
    try {
      setIsLoading(true);
      const floors: Floor[] = await fetchAllShopFloors(factoryIdValue);
      setAreaOptions(
        (floors || []).map((f) => ({
          label: f.floorName,
          value: f.id,
        }))
      );
    } catch {
      setAreaOptions([]);
    } finally {
      setIsLoading(false);
    }
  }, [factoryIdValue]);

  const handleAreasChange = (e: { value: string[] }) => setSelectedAreas(e.value);

  const handleOpenAreas = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setAreasVisible(true);
    await loadFloors();
  };


  const handleAddAreas = () => {
    if (!selectedAreas.length) {
      setAreasVisible(false);
      return;
    }

    const nodes = getNodes();
    const edges = getEdges();
    const ts = Date.now();

    const existingOutCount = edges.filter((e) => e.source === factoryNodeId).length;
    let localOffset = existingOutCount;

    const toAddNodes: any[] = [];
    const toAddEdges: any[] = [];

    selectedAreas.forEach((areaId, i) => {
      const sfNodeId = `shopFloor_${areaId}`;
      const exists = nodes.find((n) => n.id === sfNodeId);
      const label = areaOptions.find((o) => o.value === areaId)?.label ?? t("reactflow:area");

      if (!exists) {
        toAddNodes.push({
          id: sfNodeId,
          type: "shopFloor",
          data: { label, type: "shopFloor" },
          position: {
            x: (xPos ?? 0) + 200 * localOffset - 100,
            y: (yPos ?? 0) + 127,
          },
        });
        localOffset += 1;
      }

      const edgeAlready =
        edges.some((e) => e.source === factoryNodeId && e.target === sfNodeId) ||
        toAddEdges.some((e) => e.source === factoryNodeId && e.target === sfNodeId);

      if (!edgeAlready) {
        toAddEdges.push({
          id: `reactflow__edge-${factoryNodeId}-${sfNodeId}_${ts}_${i}`,
          source: factoryNodeId,
          sourceHandle: "bottom",
          target: sfNodeId,
          targetHandle: "in",
          type: "smoothstep",
        });
      }
    });

    if (toAddNodes.length) setNodes((prev) => [...prev, ...toAddNodes]);
    if (toAddEdges.length) setEdges((prev) => [...prev, ...toAddEdges]);

    if (toAddNodes.length || toAddEdges.length) {
      const focusIds = selectedAreas.map((id) => ({ id: `shopFloor_${id}` }));
      setTimeout(() => fitView({ nodes: focusIds, padding: 0.2, includeHiddenNodes: true }), 0);
    }

    setAreasVisible(false);
  };


  useEffect(() => {
    if (!areasVisible || !latestShopFloor) return;

    const id = latestShopFloor.id;
      const label =
      latestShopFloor?.name?.value ??
      latestShopFloor?.floorName ??
      String(latestShopFloor?.name ?? t('reactflow:area'));

    setAreaOptions((prev) => {
      if (!id || prev.some((o) => o.value === id)) return prev;
      return [{ label, value: id }, ...prev];
    });

    setSelectedAreas((prev) => (id && !prev.includes(id) ? [...prev, id] : prev));
  }, [areasVisible, latestShopFloor]);

  useEffect(() => {
    const fetchAccessGroup = async () => {
      try {
        const data = await getAccessGroup();
        setAccessgroupIndexedDb(data);
      } catch(error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchAccessGroup();
  }, []);

  return (
    <div className={`factory-node ${selected ? "is-selected" : ""}`}>
      <div className="fn-icon">
        <img
          src="/factory-flow-buttons/factory-node-icon.svg"
          alt="Factory"
          className="fn-icon-img"
          width={18}
          height={18}
        />
      </div>

      <div className="fn-titlewrap">
        <span className="fn-title">{data.label}</span>
        <img
          src="/factory-flow-buttons/factory-id.svg"
          alt="ID"
          className="fn-badge-svg"
          width={14}
          height={14}
        />
      </div>

      <div className="fn-pill">{t('reactflow:factorySite')}</div>

      <Handle id="bottom" type="source" position={Position.Bottom} className="handle-out assetNode" />

      <Button
        aria-label={t('reactflow:addAreas')}
        className="global-button is-grey nodrag nopan factory-add-btn p-button-rounded p-button-icon-only"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={handleOpenAreas}
      >
        <svg className="btn-plus-icon" viewBox="0 0 24 24" role="img" aria-hidden="true">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </Button>

      <Dialog
        header={
          <div className="areas-header">
            <span>{t('reactflow:selectAreas')}</span>
            <Button
              aria-label={t('reactflow:addAreas')}
              className="global-button nodrag nopan add-areas-hdr-btn"
              onClick={(e) => {
                e.stopPropagation();
                setIsCreateVisible(true);
              }}
              disabled={isLoading || !factoryIdValue || !accessgroupIndexDb?.access_group?.create}
              tooltip={t("overview:access_permission")}
              tooltipOptions={{ position: "bottom", showOnDisabled: true, disabled: accessgroupIndexDb?.access_group.create === true }}
            >
              <svg className="btn-plus-icon" viewBox="0 0 24 24" role="img" aria-hidden="true">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span>{t('reactflow:addAreas')}</span>
            </Button>
          </div>
        }
        visible={areasVisible}
        onHide={() => setAreasVisible(false)}
        style={{ width: "32rem" }}
        modal
        dismissableMask
        className="dialog-class"
      >
        <div className="p-3">
          <div className="p-field" style={{ marginTop: 8 }}>
            {!factoryIdValue ? (
              <div className="text-center text-gray-500 p-2">{t('reactflow:missingFactoryId')}</div>
            ) : isLoading ? (
              <div className="text-center text-gray-500 p-2">{t('reactflow:loading')}</div>
            ) : areaOptions.length ? (
              <div style={{ maxHeight: 260, overflowY: "auto" }} className="flex flex-column gap-2">
                {areaOptions.map((opt) => {
                  const checked =
                    selectedAreas.includes(opt.value) || selectedAreas.includes(opt.label);
                  const nextArray = checked
                    ? selectedAreas.filter((v) => v !== opt.value && v !== opt.label)
                    : [
                        ...selectedAreas.filter((v) => v !== opt.value && v !== opt.label),
                        opt.value,
                      ];
                  return (
                    <div key={opt.value} className="flex align-items-center gap-2">
                      <input
                        type="checkbox"
                        className="custom-checkbox"
                        checked={checked}
                        onChange={() => handleAreasChange({ value: nextArray })}
                        disabled={!accessgroupIndexDb?.access_group?.create}
                      />
                      <span>{opt.label}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-gray-500 p-2">{t('reactflow:noAreasAvailable')}</div>
            )}
          </div>

          <div className="flex justify-content-end gap-2" style={{ marginTop: 12 }}>
            <Button label={t('reactflow:close')} onClick={() => setAreasVisible(false)} text className="global-button is-grey" />
            <Button 
              label={t('reactflow:add')}
              onClick={handleAddAreas}
              disabled={!selectedAreas.length || !accessgroupIndexDb?.access_group?.create} 
              className="global-button" 
              tooltip={t("overview:access_permission")}
              tooltipOptions={{ position: "bottom", showOnDisabled: true, disabled: accessgroupIndexDb?.access_group.create === true }}
            />
          </div>
        </div>
      </Dialog>

      {isCreateVisible && (
        <CreateShopFloor
          isVisibleProp={isCreateVisible}
          setIsVisibleProp={setIsCreateVisible}
          factoryId={factoryIdValue}
        />
      )}
    </div>
  );
};

export default CustomFactoryNode;
