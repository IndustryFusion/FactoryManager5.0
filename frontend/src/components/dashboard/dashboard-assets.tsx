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

import React, { Dispatch, SetStateAction, useEffect, useState, ReactNode, useRef } from "react";
import { Asset } from "@/types/asset-types";
import { fetchAsset } from "@/utility/asset-utility";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { useRouter } from "next/router";
import { useDashboard } from "@/context/dashboard-context";
import OnboardForm from "./onboard-form";
import EditOnboardForm from "./edit-onboard-form";
import { Toast, ToastMessage } from "primereact/toast";
import { InputText } from "primereact/inputtext";
import "../../styles/dashboard.css";
import { useDispatch, useSelector } from "react-redux";
import { update } from '@/redux/entityId/entityIdSlice';
import { useTranslation } from "next-i18next";
import axios from "axios";
import { ProgressSpinner } from 'primereact/progressspinner';
import { fetchAssets } from '@/redux/assetManagement/assetManagementSlice';
import { RootState } from '@/redux/store';
import Image from "next/image";
import AssetSelector from "./asset-selector";
import IfricIdBadge from "./ifric-id-badge";
import { Skeleton } from "primereact/skeleton";

interface PrefixedAssetProperty {
  key: string;
  value: string;
}

interface DashboardAssetsProps {
  setBlockerProp: Dispatch<SetStateAction<boolean>>
  setPrefixedAssetPropertyProp: Dispatch<SetStateAction<PrefixedAssetProperty[]>>;
}

const DashboardAssets: React.FC<DashboardAssetsProps> = ({ setBlockerProp, setPrefixedAssetPropertyProp }) => {
  const [assetData, setAssetData] = useState<Asset[]>([]);
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [showBlocker, setShowBlocker] = useState(false);
  const [editOnboardAsset, setEditOnboardAsset] = useState({
    showEditOnboard: false,
    onboardAssetId: "",
    successToast: false
  })
  const [onboardAsset, setOnboardAsset] = useState(false)
  const [selectedRow, setSelectedRow] = useState<Asset | null>(null);
  const [searchedAsset, setSearchedAsset] = useState("")
  const dataTableRef = useRef(null);
  const router = useRouter();
  const { machineStateValue, setMachineStateValue, setSelectedAssetData, setAssetCount, relationsCount, notificationData, runningSince } = useDashboard();
  const toast = useRef<Toast>(null);
  const dispatch = useDispatch();
  const { t } = useTranslation(['placeholder', 'dashboard']);
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;
  const { assets, loading } = useSelector((state: RootState) => state.assetManagement);
  const [showSelector, setShowSelector] = useState<boolean>(true);

  const productNameBodyTemplate = (rowData: Asset): React.ReactNode => {
    return <>{rowData?.product_name}</>;
  };
  const assetTypeBodyTemplate = (rowData: Asset): React.ReactNode => {
    const assetType = rowData?.type?.split('/')[5];
    return <>{assetType}</>;
  };
  const productIconTemplate = (rowData: Asset): React.ReactNode => {
    if (rowData && rowData.product_image && rowData.product_image !== 'NULL') {
      return (
        <img
          src={rowData.product_image}
          style={{ width: "70px", height: "auto" }}
        />
      );
    } else {
      return <span>No Image</span>;
    }
  };
  const editOnboardBodyTemplate = () => {
    setEditOnboardAsset((prev) => ({
      ...prev,
      showEditOnboard: true,
      onboardAssetId: selectedRow?.id ?? ""
    }))
  }

  const viewBodyTemplateNew = (rowData: Asset): React.ReactNode => {
    return (
      <>
        <Button
          className="onboard-btn-new"
          onClick={(e) => {
              setShowBlocker(true);
          }}
          title="Onboard form"
        >
          <img src="/link.png" alt="" width="30px" height="30px" />
        </Button>
      </>
    )
  }

  const rowClassName = (rowData: Asset) => {
    return { 'selected-row': selectedRow && selectedRow.id === rowData.id };
  };

  const handleAsset = async () => {
    try {
      if(!assets.length) {
        dispatch(fetchAssets());
      }
    } catch (error) {
      console.error("Fetched assets:", error)
    }
  }

  const handleRefresh = () => {
    try {
      dispatch(fetchAssets());
    } catch (error) {
      console.error("Fetched assets:", error)
    }
  };


  const handleClick = async (selectedAsset: Asset) => {
    const response = await axios.get(API_URL + `/mongodb-templates/type/${btoa(selectedAsset.type)}`, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      withCredentials: true,
    });

    // Collect keys where the segment is 'realtime'
    const prefixedKeys = Object.keys(response.data.properties).filter(
      (key) => response.data.properties[key].segment === 'realtime'
    );

    prefixedKeys.forEach(key => {
      setPrefixedAssetPropertyProp(prev => [...prev, { key, value: selectedAsset[key] }]);
    });
    dispatch(update(selectedAsset?.id));
    setSelectedAssetData(selectedAsset);

    if (prefixedKeys.length > 0) {
      setShowBlocker(false);
    }

    const machineStateKey = Object.keys(selectedAsset).find(key => key.includes('machine_state'));
    if (machineStateKey && selectedAsset[machineStateKey]) {
      setMachineStateValue(selectedAsset[machineStateKey])
    }
  };


  const showToast = (severity: ToastMessage['severity'], summary: string, message: string) => {
    toast.current?.show({ severity: severity, summary: summary, detail: message, life: 5000 });
  };

  const searchAsset = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchedText = e.target.value;
    setSearchedAsset(e.target.value);

    if (searchedText.length === 0) {
      setAssetData(allAssets)
    } else {

      const filteredAssets = searchedText.length > 0 ? [...assetData].filter(ele =>
        ele?.product_name?.toLowerCase().includes(searchedAsset.toLowerCase())
      ) : allAssets;
      setAssetData(filteredAssets)
    }
  }



  useEffect(() => {
    if (router.isReady) {
        handleAsset();
        if (editOnboardAsset.successToast) {
          showToast("success", "success", "onboard updated successfully")
        }
    }
  }, [router.isReady, editOnboardAsset.successToast])


  useEffect(() => {
    if (onboardAsset && showBlocker === false) {
      showToast("warn", "warning", "file already exists")
    }
  }, [onboardAsset, showBlocker])

  useEffect(() => {
    if (router.isReady && router.query.asset) {
      const matchedAsset = assets.find(asset => asset.product_name === router.query.asset);
      setSelectedRow(matchedAsset || assets[0] || null);
      setShowSelector(false)
    } else {
      setSelectedRow(assets[0]);
    }
    setAssetData(assets);
    setAllAssets(assets);
    setAssetCount(assets.length);
  }, [assets, router])

  const getProductType = (name: string) => {
    if(!name){
      return null
    }
    const lastSegment = name.split('/').pop();
    if (!lastSegment) return null;
    const spaced = lastSegment.replace(/([a-z])([A-Z])/g, '$1 $2');
    const capitalized = spaced.replace(/\b\w/g, c => c.toUpperCase());
    return capitalized;
  }

  
  const loadingSkeleton = () =>{
    return(
      <div className='flex flex-column gap-4 factory_dashboard_loader'>
         <Skeleton height='205px'></Skeleton>
         <div className='flex gap-3'>
         <Skeleton height='88px'></Skeleton>
         <Skeleton height='88px'></Skeleton>
         <Skeleton height='88px'></Skeleton>
         <Skeleton height='88px'></Skeleton>
         </div>
         <Skeleton height='400px'></Skeleton>
      </div>

    )
   }



  return (
    <>
      <Toast ref={toast} />
      <div>
        <div className="dashboard-assets">
          {loading ? (
            loadingSkeleton()
          ):(
            <div className="data_viewer_card asset_details_main_header">
            <div style={{display: `${showSelector ? "block" : "none"}`}}>
              <div className=" flex justify-content-between">
                <label className="select_asset_heading" htmlFor="asset_selector">{t("dashboard:select_asset")}</label>
                {/* <img src="/refresh.png" alt="table-icon" width="30px" height="30px" /> */}
              </div>
              <div className="product_selector_wrapper">
                <AssetSelector
                  assets={assetData}
                  selectedAsset={selectedRow}
                  setSelectedAsset={setSelectedRow}
                  loading={loading}
                  handleClick={handleClick}
                />
              </div>
            </div>
                {selectedRow && (
                  <div className="selected_product_header">
                    <div className="selected_product_details">
                      <div className="selected_product_image_wrapper">
                        {selectedRow.product_image !== 'NULL' ? (
                          <img src={selectedRow.product_image} alt={selectedRow.product_name} className="selected_product_image" />
                        ) : (
                          <div className="product-no-img" style={{ width: '60px', height: '60px' }}>
                            <Image src="/no-image-icon.svg" width={20} height={20} alt="Missing image"></Image>
                          </div>
                        )}

                        <div className="selected_product_status">
                        </div>
                      </div>
                      <div className="flex flex-column gap-1">
                        <div className="selected_product_title">{selectedRow.product_name}</div>
                        <div className="selected_product_room_name">{getProductType(selectedRow.type)}</div>
                        <div className="selected_product_status_text">{machineStateValue === "2" ? "Running " : "Offline"}<span className="time_span">{runningSince}</span></div>
                      </div>
                    </div>
                    <div className="selected_product_actions">
                      {selectedRow.id && (
                        <IfricIdBadge ifricId={selectedRow.id} toast={toast} setShowBlocker={setShowBlocker} editOnboardBodyTemplate={editOnboardBodyTemplate}/>
                      )}
                      <div className="flex gap-3" style={{paddingRight: "70px", minWidth: "110px"}}>
                        <div className="flex align-items-center gap-2">
                          <Image src="/warning-grey.svg" width={18} height={18} alt="warning"></Image>
                          <p>{`${notificationData.length} Notifications`}</p>
                        </div>
                        <div className="flex align-items-center gap-2">
                          <Image src="/warning-grey.svg" width={18} height={18} alt="warning"></Image>
                          <p>{`${relationsCount} Connections`}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
          </div>
          )}
        </div>
        {showBlocker &&
          <OnboardForm
            showBlockerProp={showBlocker}
            setShowBlockerProp={setShowBlocker}
            asset={selectedRow}
            setBlocker={setBlockerProp}
            setOnboardAssetProp={setOnboardAsset}
          />
        }
        {editOnboardAsset.showEditOnboard &&
          <EditOnboardForm
            editOnboardAssetProp={editOnboardAsset}
            setEditOnboardAssetProp={setEditOnboardAsset}
          />
        }
      </div>
    </>
  )
}

export default DashboardAssets;