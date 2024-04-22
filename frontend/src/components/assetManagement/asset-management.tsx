//
// Copyright (c) 2024 IB Systems GmbH
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
const moment = require('moment');
import { Dialog } from "primereact/dialog";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import "../../styles/dashboard.css"
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/router";
import { fetchAsset } from "@/utility/asset-utility";
import { Asset } from "@/interfaces/asset-types";
import { fetchAllAllocatedAssets } from "@/utility/factory-site-utility";
import { InputText } from "primereact/inputtext";
import { FilterMatchMode } from "primereact/api";
import AllocatedAsset from "./allocated-asset";
import { Button } from "primereact/button";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

interface AssetManagementDialogProps {
  assetManageDialogProp: boolean;
  setAssetManageDialogProp: Dispatch<SetStateAction<boolean>>;
}

const AssetManagementDialog: React.FC<AssetManagementDialogProps> = ({ assetManageDialogProp,
  setAssetManageDialogProp
}) => {
  const [assetData, setAssetData] = useState<Asset[]>([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [globalFilterValue, setGlobalFilterValue] = useState('');
  const [filters, setFilters] = useState({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    product_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    asset_type: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    asset_manufacturer_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH }
  });
  const [deleteAsset, setDeleteAsset] = useState(false);
  const router = useRouter();

  const handleAsset = async () => {
    try {
      const response = await fetchAsset();
      if (response !== undefined) {
        setIsLoading(false);
        const sortedAssets = [...response].sort((a, b) => {
          // Use Moment.js to parse and compare the dates
          return moment(b.creation_date, "DD.MM.YYYY HH:mm:ss").diff(moment(a.creation_date, "DD.MM.YYYY HH:mm:ss"));
        });

        setAssetData(sortedAssets);
        // console.log(sortedAssets, "sorted Assets");
        // console.log(response, "all assets");
      } else {
        console.error("Fetch returned undefined");
      }
    } catch (error) {
      console.error(error)
    }
  }

  const deleteAssetData =async(assetId:string)=>{
    console.log("assetId", assetId);
    
    try{
        const response = await axios.delete( API_URL + '/asset/delete-asset' ,{
            params:{
                id: assetId
            },
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            withCredentials: true,
        })
        console.log("delted asset", response);
        

    }catch(error){
        console.error(error)
    }
  }


  const productNameBodyTemplate = (rowData: Asset): React.ReactNode => {
    return <>{rowData?.product_name}</>;
  };
  const assetTypeBodyTemplate = (rowData: Asset): React.ReactNode => {
    const assetType = rowData?.type?.split('/')[5];
    return <>{assetType}</>;
  };
  const productIconTemplate = (rowData: Asset): React.ReactNode => {
    return rowData?.product_icon ? (
      <img
        src={rowData?.product_icon}
        alt={rowData?.product_name}
        style={{ width: "70px", height: "auto" }}
      />
    ) : (
      <span>No Image</span>
    );
  };
  const manufacturerDataTemplate = (rowData: Asset): React.ReactNode => {
    return (
      <div className="flex flex-column">
        <img src={rowData?.logo_manufacturer} alt="maufacturer_logo" className="w-4rem shadow-2 border-round" />
        <p className="m-0 mt-1">{rowData?.asset_manufacturer_name}</p>
      </div>
    )
  }
  const actionItemsTemplate = (rowData: Asset): React.ReactNode => {
    return (
        <>
      <button className="action-items-btn"
      onClick={()=>setDeleteAsset(true)}
      >
        <i className="pi pi-trash"></i>
      </button>
      {deleteAsset && 
    <Dialog
  
      visible={deleteAsset}  onHide={() => setDeleteAsset(false)}
    >
     <p>Are you sure you want to delete this asset</p>
     <div className="flex justify-content-end gap-3">
        <Button 
        label="OK"
        onClick={()=>deleteAssetData(rowData?.id)}

        ></Button>
        <Button
        label="Cancel"
        severity="danger" outlined
        className="mr-2"
        type="button"
        onClick={() => setDeleteAsset(false)}
        ></Button>
     </div>
    </Dialog>
    }
      </>
    )
  }
  const headerElement = (
    <h3 className="px-5"> Asset Management</h3>
  )

  const onGlobalFilterChange = (e) => {
    const value = e.target.value;
    let _filters = { ...filters };
    _filters['global'].value = value;
    setFilters(_filters);
    setGlobalFilterValue(value);
  };


  const renderHeader = () => {
    return (
      <div className="flex justify-content-center">
        <span className="p-input-icon-left">
          <i className="pi pi-search" />
          <InputText
            value={globalFilterValue}
            onChange={onGlobalFilterChange}
            placeholder="Search" />
        </span>
      </div>
    );
  };
  const header = renderHeader();


  


  useEffect(() => {
    if (Cookies.get("login_flag") === "false") {
      router.push("/login");
    } else {
      if (router.isReady) {
        handleAsset();
      }
    }
  }, [])

  return (
    <>
    <Dialog
      header={headerElement}
      visible={assetManageDialogProp} style={{ width: '50vw' }} onHide={() => setAssetManageDialogProp(false)}>
      <div className="px-4"
        style={{ borderRadius: "10px" }}
      >
        {
          isLoading ?
            <div className="flex flex-column justify-content-center align-items-center"
              style={{}}
            >
              <p> Loading... Assets</p>
              <img src="/table.png" alt="" width="12%" height="12%" />
            </div>
            :
            <>
              <DataTable
                rows={5}
                paginator
                value={assetData}
                style={{ zoom: "73%" }}
                scrollable={true}
                scrollHeight="750px"
                className="assets-table"
                selectionMode="single"
                selection={selectedProduct}
                onSelectionChange={(e) => setSelectedProduct(e.value)}
                header={header}
                filters={filters}
                globalFilterFields={['product_name', 'asset_type', 'asset_manufacturer_name']}
              >
                <Column
                  header="Product Image"
                  field="product_icon"
                  body={productIconTemplate}

                />
                <Column
                  header="Product Name"
                  field="product_name"
                  body={productNameBodyTemplate}
                />
                <Column
                  header="AssetType"
                  field="asset_type"
                  body={assetTypeBodyTemplate}
                />
                <Column
                  field="asset_manufacturer_name"
                  header="Manufacturer"
                  body={manufacturerDataTemplate}
                />
                <Column
                  body={actionItemsTemplate}
                ></Column>
              </DataTable>
              <AllocatedAsset />
            </>
        }
      </div>

    </Dialog>
    
    </>
  )
}

export default AssetManagementDialog;