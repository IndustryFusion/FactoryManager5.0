import React, { useMemo, useState, useCallback, useContext, useEffect, useRef } from "react";
import { Handle, Position, NodeProps, NodeToolbar } from "reactflow";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { useRouter } from "next/router";
import { useDispatch, useSelector } from "react-redux";
import "../../styles/factory-flow/shop-floor.css";
import { RootState } from "@/redux/store";
import { create as cacheUnallocated } from "@/redux/unAllocatedAsset/unAllocatedAssetSlice";
import { deleteShopFloorById, getNonShopFloorAsset } from "@/utility/factory-site-utility";
import EdgeAddContext from "@/context/edge-add-context";
import { Toast } from "primereact/toast";
import CreateShopFloor from "../shopFloorForms/create-shop-floor-form";
import EditShopFloor from "../shopFloorForms/edit-shop-floor-form";
import DeleteDialog from "../delete-dialog";
import { getAccessGroup } from '@/utility/indexed-db';
import { useTranslation } from "next-i18next";

type ShopFloorNodeData = {
  label: string;
  type: "shopFloor";
  kind?: string;           
};

type StoreAsset = {
  id: string;
  product_name?: any;
  asset_category?: any;
  asset_serial_number?: any;
  [k: string]: any;
};

type Option = {
  value: string;
  label: string;
  category?: string;
  serial?: string;
};

const toText = (v: any): string =>
  v && typeof v === "object" && "value" in v ? String(v.value ?? "") : String(v ?? "");

const shortSerial = (s?: string) => (s && s.length > 7 ? `${s.slice(0, 3)}..${s.slice(-4)}` : s || "");

const CustomShopFloorNode: React.FC<NodeProps<ShopFloorNodeData>> = ({
  id: shopFloorNodeId,
  data,
  selected
}) => {
  const { t } = useTranslation(["overview","reactflow"]);
  const pillText = data.kind || t('reactflow:area');
  const router = useRouter();
  const dispatch = useDispatch();
  const { addAssetsToShopFloor ,setNodes: setGraphNodes, setEdges: setGraphEdges  } = useContext(EdgeAddContext) as {
      addAssetsToShopFloor?: (
        shopFloorNodeId: string,
        assets: { id: string; label?: string; asset_category?: string; asset_serial_number?: string }[]
      ) => string[];
      setNodes?: React.Dispatch<any>;
      setEdges?: React.Dispatch<any>;
    };


  const factoryId = useMemo(() => {
    const q = (router.query?.factoryId || router.query?.id) as string | undefined;
    if (q) return decodeURIComponent(q);
    const m = router.asPath?.match(/factory-management\/([^/?#]+)/);
    return m ? decodeURIComponent(m[1]) : undefined;
  }, [router.query, router.asPath]);

  const unAllocatedAssetData = useSelector((s: RootState) => s.unAllocatedAsset);
  const [showActions, setShowActions] = useState(false);
  const toast = useRef<Toast>(null);
  const backendShopFloorId = useMemo(
    () => shopFloorNodeId.replace(/^shopFloor_/, ""),
    [shopFloorNodeId]
  );
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [assetsVisible, setAssetsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [options, setOptions] = useState<Option[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [accessgroupIndexDb, setAccessgroupIndexedDb] = useState<any>(null);

  const optionsFromStore = useCallback((storeVal: any): Option[] => {
    const list: StoreAsset[] = Array.isArray(storeVal)
      ? storeVal
      : storeVal
      ? Object.values(storeVal as Record<string, StoreAsset>)
      : [];
    return list.map((a) => {
      const label = toText(a.product_name) || shortSerial(toText(a.asset_serial_number)) || a.id;
      return {
        value: a.id,
        label,
        category: toText(a.asset_category) || undefined,
        serial: toText(a.asset_serial_number) || undefined,
      };
    });
  }, []);
  
  useEffect(() => {
    if (!selected) setShowActions(false);
  }, [selected]);
   const handleOpenCreate = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!factoryId) {
        toast.current?.show({
          severity: "warn",
          summary: t('missingFactoryId'),
          life: 2500,
        });
        return;
      }
      setShowCreate(true);
    },
    [factoryId, t]
  );

  // Edit: open edit form
  const handleEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!backendShopFloorId) {
        toast.current?.show({
          severity: "warn",
          summary: t('noShopFloorIdToEdit'),
          life: 2500,
        });
        return;
      }
      setShowEdit(true);
    },
    [backendShopFloorId, t]
  );


  const handleAskDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setShowConfirmDelete(true);
    },
    []
  );
   const handleConfirmDelete = useCallback(async () => {
    if (!factoryId || !backendShopFloorId) {
      toast.current?.show({
        severity: "warn",
        summary: t('missingIds'),
        detail: t('factoryOrShopFloorIdMissing'),
        life: 2500,
      });
      return;
    }

    try {
      await deleteShopFloorById(backendShopFloorId, factoryId);

      // Remove node + connected edges locally
      setGraphNodes?.((prev: any[]) => prev.filter((n) => n.id !== shopFloorNodeId));
      setGraphEdges?.((prev: any[]) =>
        prev.filter((e) => e.source !== shopFloorNodeId && e.target !== shopFloorNodeId)
      );

      toast.current?.show({
        severity: "success",
        summary: t('deleted'),
        detail: t('shopFloorRemoved', { label: data.label }),
        life: 2200,
      });
    } catch (err) {
      console.error("Delete shop floor failed:", err);
      toast.current?.show({
        severity: "error",
        summary: t('deleteFailed'),
        detail: t('couldNotDeleteShopFloor'),
        life: 2800,
      });
    } finally {
      setShowConfirmDelete(false);
    }
  }, [factoryId, backendShopFloorId, setGraphNodes, setGraphEdges, shopFloorNodeId, data?.label, t]);
  const openAssets = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      setAssetsVisible(true);

      const cached = optionsFromStore(unAllocatedAssetData);
      if (cached.length) {
        setOptions(cached);
        return;
      }

      if (!factoryId) return;

      try {
        setIsLoading(true);
        const fetched = await getNonShopFloorAsset(factoryId);
        dispatch(cacheUnallocated(fetched));
        setOptions(optionsFromStore(fetched));
      } catch {
        setOptions([]);
      } finally {
        setIsLoading(false);
      }
    },
    [factoryId, unAllocatedAssetData, optionsFromStore, dispatch]
  );

  const handleAddAssets = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      openAssets(e); 
    },
    [openAssets]
  );

  const toggle = (id: string) => {
    const willCheck = !selectedIds.includes(id);
    const next = willCheck ? [...selectedIds, id] : selectedIds.filter((x) => x !== id);
    setSelectedIds(next);
    if (willCheck) {
      if (typeof addAssetsToShopFloor !== "function") {
        console.error("EdgeAddContext missing addAssetsToShopFloor");
        return;
      }
      const opt = options.find((o) => o.value === id);
      const payload = [
        {
          id,
          label: opt?.label,
          asset_category: opt?.category,
          asset_serial_number: opt?.serial,
        },
      ];
      addAssetsToShopFloor(shopFloorNodeId, payload);
    }

  };

  const handleAdd = () => {
    setAssetsVisible(false);
  };

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
    <div className={`shopfloor-node ${selected ? "is-selected" : ""}`} 
      onClick={(e) => { e.stopPropagation(); setShowActions(true); }}
    >
      <NodeToolbar
        isVisible={showActions}
        position="top"
        offset={10}
        className="sf-toolbar flex"
      >
        <Button
          aria-label={t('reactflow:addAssets')}
          className="global-button is-grey nodrag nopan sf-action-btn p-button-rounded p-button-icon-only"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={handleAddAssets}
          disabled={!accessgroupIndexDb?.access_group?.create} 
          tooltip={!accessgroupIndexDb?.access_group?.create ? t("overview:access_permission") : t('reactflow:addAssets')}
          tooltipOptions={{ position: "top", showOnDisabled: true, disabled: accessgroupIndexDb?.access_group.create === true }}
        >
          <img src="/factory-flow-buttons/asset-plus-icon.svg" alt="" />
        </Button>

        <Button
          aria-label={t('reactflow:addShopFloor')}
          className="global-button is-grey nodrag nopan sf-action-btn p-button-rounded p-button-icon-only"
          onMouseDown={(e) => e.stopPropagation()}
           onClick={handleOpenCreate}
          tooltip={t('reactflow:addShopFloor')}
          tooltipOptions={{ position: "top" }}
        >
          <img src="/factory-flow-buttons/hut.svg" alt="" />
        </Button>

        <Button
          aria-label={t('reactflow:edit')}
          className="global-button is-grey nodrag nopan sf-action-btn p-button-rounded p-button-icon-only"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={handleEdit}
          tooltip={t('reactflow:edit')}
          tooltipOptions={{ position: "top" }}
        >
          <img src="/factory-flow-buttons/edit-icon.svg" alt="" width="42px" height="42px" />
        </Button>

        <Button
          aria-label={t('reactflow:delete')}
          className="global-button is-grey nodrag nopan sf-action-btn p-button-rounded p-button-icon-only"
          onMouseDown={(e) => e.stopPropagation()}
           onClick={handleAskDelete}
          tooltip={t('reactflow:delete')}
          tooltipOptions={{ position: "top" }}
        >
          <img src="/factory-flow-buttons/delete-02 (1).svg" alt="" width="22px" height="22px"/>
        </Button>
      </NodeToolbar>
      <div className="sf-icon">
        <svg viewBox="0 0 24 24" className="sf-gear" aria-hidden>
          <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
          <path d="M19.4 13.5a7.6 7.6 0 0 0 .06-3l1.74-1a.5.5 0 0 0 .19-.68l-1.7-2.95a.5.5 0 0 0-.64-.2l-1.98.83a7.7 7.7 0 0 0-2.6-1.5l-.3-2.15A.5.5 0 0 0 13.6 2h-3.2a.5.5 0 0 0-.49.42l-.31 2.15a7.7 7.7 0 0 0-2.6 1.5l-1.98-.83a.5.5 0 0 0-.64.2L2.78 8.4a.5.5 0 0 0 .19.68l1.74 1a7.6 7.6 0 0 0 .06 3l-1.8 1.03a.5.5 0 0 0-.2.67l1.7 2.95a.5.5 0 0 0 .64.2l2-.84a7.7 7.7 0 0 0 2.58 1.5l.32 2.16a.5.5 0 0 0 .49.42h3.2a.5.5 0 0 0 .49-.42l.32-2.16a7.7 7.7 0 0 0 2.58-1.5l2 .84a.5.5 0 0 0 .64-.2l1.7-2.95a.5.5 0 0 0-.2-.67l-1.8-1.03Z" />
        </svg>
      </div>

      <div className="sf-titlewrap">
        <span className="sf-title">{data.label}</span>
      </div>

      <div className="sf-pill">{pillText}</div>

      <Handle id="in" type="target" position={Position.Top} className="handle-in customHandle" />
      <Handle id="out" type="source" position={Position.Bottom} className="handle-out customHandle" />

      <Button
        aria-label={t('reactflow:addAssets')}
        className="global-button is-grey nodrag nopan shopfloor-add-btn p-button-rounded p-button-icon-only"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={openAssets}
      >
        <svg className="btn-plus-icon" viewBox="0 0 24 24" role="img" aria-hidden="true">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </Button>


      <Dialog
        visible={assetsVisible}
        onHide={() => setAssetsVisible(false)}
        style={{ width: "32rem" }}
        modal
        dismissableMask
        className="dialog-class"
        header={
          <div className="areas-header">
            <span>{t('reactflow:selectAssets')}</span>
            <Button
              aria-label={t('reactflow:createRetrofitAssets')}
              className="global-button nodrag nopan add-areas-hdr-btn"
              onClick={(e) => {
                e.stopPropagation();
              }}
              disabled={!factoryId || !accessgroupIndexDb?.access_group?.create} 
              tooltip={t("overview:access_permission")}
              tooltipOptions={{ position: "bottom", showOnDisabled: true, disabled: accessgroupIndexDb?.access_group.create === true }}
            >
              <svg className="btn-plus-icon" viewBox="0 0 24 24" role="img" aria-hidden="true">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span>{t('reactflow:createRetrofitAssets')}</span>
            </Button>
          </div>
        }
      >
        <div className="p-field" style={{ marginTop: 8 }}>
          {!factoryId ? (
            <div className="text-center text-gray-500 p-2">{t('reactflow:missingFactoryId')}</div>
          ) : isLoading ? (
            <div className="text-center text-gray-500 p-2">{t('reactflow:loading')}</div>
          ) : options.length ? (
            <div style={{ maxHeight: 260, overflowY: "auto" }} className="flex flex-column gap-2">
              {options.map((opt) => {
                const checked = selectedIds.includes(opt.value);
                return (
                  <div key={opt.value} className="flex align-items-center gap-2">
                    <input
                      type="checkbox"
                      className="custom-checkbox"
                      checked={checked}
                      onChange={() => toggle(opt.value)}  // << create on click
                      disabled={!accessgroupIndexDb?.access_group?.create}
                    />
                    <span>
                      {opt.label}
                      {opt.serial ? <span style={{ color: "#6b7280" }}> · {shortSerial(opt.serial)}</span> : null}
                      {opt.category ? (
                        <span
                          className="ml-2 px-2 py-1 text-xs rounded-full"
                          style={{ background: "#eef2ff", color: "#4f46e5" }}
                        >
                          {opt.category}
                        </span>
                      ) : null}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-500 p-2">{t('reactflow:noAssetsAvailable')}</div>
          )}
        </div>

        <div className="flex justify-content-end gap-2" style={{ marginTop: 12 }}>
          <Button label={t('reactflow:close')} onClick={() => setAssetsVisible(false)} text className="global-button is-grey" />
          <Button label={t('reactflow:done')} onClick={handleAdd} className="global-button" />
        </div>
      </Dialog>

      {showCreate && factoryId && (
        <CreateShopFloor isVisibleProp={showCreate} setIsVisibleProp={setShowCreate} factoryId={factoryId} />
      )}

     
      {showEdit && (
        <EditShopFloor isEditProp={showEdit} setIsEditProp={setShowEdit} editShopFloorProp={backendShopFloorId} />
      )}
      {showConfirmDelete && (
        <DeleteDialog
          deleteDialog={showConfirmDelete}
          setDeleteDialog={setShowConfirmDelete}
          handleDelete={handleConfirmDelete}
          deleteItemName={data?.label}
        />
      )}
    </div>
  );
};

export default CustomShopFloorNode;
