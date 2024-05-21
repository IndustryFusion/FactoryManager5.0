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
import Cookies from "js-cookie";
import { useDashboard } from "@/context/dashboard-context";
import OnboardForm from "./onboard-form";
import EditOnboardForm from "./edit-onboard-form";
import { Toast, ToastMessage } from "primereact/toast";
import { InputText } from "primereact/inputtext";
import "../../styles/dashboard.css";
import { useDispatch } from "react-redux";
import { create, update} from '@/state/entityId/entityIdSlice';
import { useTranslation } from "next-i18next";
const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

interface DashboardAssetsProps {
  setBlockerProp: Dispatch<SetStateAction<boolean>>
  setPrefixedAssetPropertyProp: any
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
  const {setMachineStateValue, setSelectedAssetData,setAssetCount } = useDashboard();
  const toast = useRef<any>(null);
  const dispatch = useDispatch();
  const { t } = useTranslation(['placeholder','dashboard']);



  const productNameBodyTemplate = (rowData: Asset): React.ReactNode => {
    return <>{rowData?.product_name}</>;
  };
  const assetTypeBodyTemplate = (rowData: Asset): React.ReactNode => {
    const assetType = rowData?.type?.split('/')[5];
    return <>{assetType}</>;
  };
  const productIconTemplate = (rowData: Asset): React.ReactNode => {
    if (rowData && rowData.product_icon && rowData.product_icon !== 'NULL') {
      return (
          <img
            src={rowData.product_icon}
            style={{ width: "70px", height: "auto" }}
          />
      );
    } else {
        return <span>No Image</span>;
    }
  };
  const viewBodyTemplate = (rowData: Asset): React.ReactNode => {
    return (
      <>
        <Button
        className="onboard-btn"
          onClick={(e) => {
            setEditOnboardAsset(() => ({
              ...editOnboardAsset,
              showEditOnboard: true,
              onboardAssetId: rowData?.id
            }))
          }}
          >
          <img src="/onboard.png" alt="" width="50px" height="50px"/>
         </Button>
      </>
    )
  }

  const rowClassName = (rowData:Asset) => {
    return { 'selected-row': selectedRow && selectedRow.id === rowData.id };
};

  const handleAsset = async () => {
    try {
      const response = await fetchAsset();
      if (response !== undefined) {
        setSelectedRow(response[0]);
        setAssetData(response);
        setAllAssets(response);
        setAssetCount(response.length)
      } else {
        console.error("Fetch returned undefined");
      }
    } catch (error) {
      console.error("Fetched assets:", error)
    }
  }


  const handleClick = (selectedAsset: Asset) => {
    const prefix = "http://www.industry-fusion.org/fields#";
    const allKeys = Object.keys(selectedAsset);
    const prefixedKeys = allKeys.filter(key => key.startsWith(prefix));

    setPrefixedAssetPropertyProp(prefixedKeys);
    dispatch(update(selectedAsset?.id));
    setSelectedAssetData(selectedAsset);
  
    if (prefixedKeys.length > 0) {
      setShowBlocker(false);
    } else {
      setShowBlocker(true);
    }

    if (prefix) {
      setMachineStateValue(selectedAsset["http://www.industry-fusion.org/fields#machine-state"]?.value)
    }
  };

 
  const showToast = (severity: ToastMessage['severity'], summary: string, message: string) => {
    toast.current?.show({ severity: severity, summary: summary, detail: message, life: 5000 });
  };

  const searchAsset = (e: any) => {
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
    if (Cookies.get("login_flag") === "false") {
      router.push("/login");
    } else {
      if (router.isReady) {
        handleAsset();
        if (editOnboardAsset.successToast) {
          showToast("success", "success", "onboard updated successfully")
        }
      }
    }
  }, [router.isReady, editOnboardAsset.successToast])


  useEffect(() => {
    if (onboardAsset && showBlocker === false) {
      showToast("warn", "warning", "file already exists")
    }
  }, [onboardAsset, showBlocker])


  return (
    <>
      <Toast ref={toast} />
      <div style={{ zoom: "74%" }}>
        <div className="dashboard-assets">
          <div className="card h-auto " style={{ width: "100%" }}>
            <div className=" flex justify-content-between">
            <h5 className="heading-text">Assets</h5>
            <img src="/refresh.png" alt="table-icon" width="30px" height="30px" />
            </div>            
            <div className="mb-5">
              <span className="p-input-icon-left">
                <i className="pi pi-search" />
                <InputText
                  type="search"
                  value={searchedAsset}
                  onChange={searchAsset}
                  placeholder={t('placeholder:searchByProduct')}
                  className="mb-10" style={{ borderRadius: "10px", width: "460px" }} />
              </span>
            </div>
            <DataTable
              ref={dataTableRef}
              rows={6}
              paginator
              value={assetData}
              className="dashboard-assets"
              scrollable={true}
              scrollHeight="750px"
              onRowClick={(e) => handleClick(e.data as Asset)}
              selectionMode="single"
              selection={selectedRow}
              onSelectionChange={(e) => setSelectedRow(e.value as Asset)}
              rowClassName={rowClassName}
            >
              <Column
                header={t('dashboard:productImage')}
                field="product_icon"
                body={productIconTemplate}
              />
              <Column
                header={t('dashboard:productName')}
                field="product_name"
                body={productNameBodyTemplate}
              />
              <Column
                header={t('dashboard:assetType')}
                field="asset_type"
                body={assetTypeBodyTemplate}
              />
              <Column
                header={t('dashboard:view')}
                style={{ width: '15%' }}
                body={viewBodyTemplate}

              />
            </DataTable>
          </div>
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