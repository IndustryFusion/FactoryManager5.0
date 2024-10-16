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
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { fetchAsset } from "@/utility/asset-utility";
import { Asset } from "@/types/asset-types";
import { fetchAllAllocatedAssets } from "@/utility/factory-site-utility";
import { InputText } from "primereact/inputtext";
import { FilterMatchMode } from "primereact/api";
import AllocatedAsset from "./allocated-asset";
import { Button } from "primereact/button";
import axios from "axios";
import { Toast, ToastMessage } from "primereact/toast";
import { useTranslation } from "next-i18next";
import DeleteDialog from "../delete-dialog";
import { fetchAssetManagement } from "@/utility/asset-utility";
import { ProgressSpinner } from "primereact/progressspinner"

const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

interface AssetManagementDialogProps {
  assetManageDialogProp: boolean;
  setAssetManageDialogProp: Dispatch<SetStateAction<boolean>>;
}

const AssetManagementDialog: React.FC<AssetManagementDialogProps> = ({ assetManageDialogProp,
  setAssetManageDialogProp
}) => {
  const [assetData, setAssetData] = useState<Asset[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Asset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [globalFilterValue, setGlobalFilterValue] = useState('');
  const [filters, setFilters] = useState({
    global: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    product_name: { value: null as string | null, matchMode: FilterMatchMode.STARTS_WITH },
    asset_type: { value: null as string | null, matchMode: FilterMatchMode.STARTS_WITH },
    asset_manufacturer_name: { value: null as string | null, matchMode: FilterMatchMode.STARTS_WITH }
  });
  const [deleteAssetId, setDeleteAssetId] = useState("");
  const [deleteAssetName, setDeleteAssetName] = useState("");
  const [visibleDelete, setVisibleDelete] = useState(false);
  const toast = useRef<Toast>(null);
  const router = useRouter();
  const { t } = useTranslation(['button', 'placeholder', 'dashboard', 'overview']);

  const handleAsset = async () => {
    try {
      const response = await fetchAssetManagement();
      if (response !== undefined) {
        setIsLoading(false);
        const sortedAssets = [...response].sort((a, b) => {
          return moment(b.creation_date, "DD.MM.YYYY HH:mm:ss").diff(moment(a.creation_date, "DD.MM.YYYY HH:mm:ss"));
        });
        setAssetData(sortedAssets);
      } else {
        console.error("Fetch returned undefined");
      }
    } catch (error) {
      console.error(error)
    }
  }

  const deleteAssetData = async () => {
    if (!deleteAssetId) return;
    try {
      const response = await axios.delete(API_URL + `/asset/delete-asset/${deleteAssetId}`, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        withCredentials: true,
      })
      if (response.data?.status === 204 && response.data?.success === true) {
        showToast("success", "success", `${deleteAssetName}  deleted successfully`);
        const updateAssets = assetData.filter(asset => asset?.id !== deleteAssetId);
        setAssetData(updateAssets)
      }
      if (response.data?.success === false) {
        showToast("error", "Error", `Asset:  ${deleteAssetName}  not able to delete`);
        const updateAssets = assetData.filter(asset => asset?.id !== deleteAssetId);
        setAssetData(updateAssets)
      }
    } catch (error) {
      console.error(error)
    }
  }

  const showToast = (severity: ToastMessage['severity'], summary: string, message: string) => {
    toast.current?.show({ severity: severity, summary: summary, detail: message, life: 5000 });
  };

  const productNameBodyTemplate = (rowData: Asset): React.ReactNode => <>{rowData?.product_name}</>;
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
  const manufacturerDataTemplate = (rowData: Asset): React.ReactNode => {
    if (rowData && rowData.logo_manufacturer && rowData.logo_manufacturer !== 'NULL') {
      return (
        <div className="flex flex-column">
          <img src={rowData?.logo_manufacturer} alt="maufacturer_logo" className="w-4rem shadow-2 border-round" />
          <p className="m-0 mt-1">{rowData?.asset_manufacturer_name}</p>
        </div>
      )
    } else {
      return <span>No Image</span>;
    }
  }
  const actionItemsTemplate = (rowData: Asset): React.ReactNode => {
    return (
      <>
        <button className="action-items-btn"
          onClick={() => {
            setVisibleDelete(true);
            setDeleteAssetId(rowData?.id);
            setDeleteAssetName(rowData?.product_name)
          }}
        >
          <i className="pi pi-trash"></i>
        </button>
      </>
    )
  }

  const headerElement = (
    <h3 className="px-5"> Asset Management</h3>
  )

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
            placeholder={t('placeholder:search')} />
        </span>
      </div>
    );
  };
  const header = renderHeader();


  useEffect(() => {
    if (router.isReady) {
      handleAsset();
    }
  }, [router.isReady])


  return (
    <>
      <Toast ref={toast} />
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
                <ProgressSpinner />
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
                  onSelectionChange={(e) => setSelectedProduct(e.value as Asset)}
                  header={header}
                  filters={filters}
                  globalFilterFields={['product_name', 'asset_type', 'asset_manufacturer_name']}
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
                    field="asset_manufacturer_name"
                    header={t('dashboard:manufacturer')}
                    body={manufacturerDataTemplate}
                  />
                  <Column
                    body={actionItemsTemplate}
                  ></Column>
                </DataTable>
              </>
          }
          <AllocatedAsset />
          {visibleDelete &&
            <DeleteDialog
              deleteDialog={visibleDelete}
              setDeleteDialog={setVisibleDelete}
              handleDelete={deleteAssetData}
              deleteItemName={deleteAssetName}
            />
          }
        </div>
      </Dialog>
    </>
  )
}

export default AssetManagementDialog;