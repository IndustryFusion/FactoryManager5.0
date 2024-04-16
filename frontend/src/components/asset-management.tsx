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
import "../styles/dashboard.css"
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/router";
import { fetchAsset } from "@/utility/asset-utility";
import { Asset } from "@/interfaces/asset-types";
import { fetchAllAllocatedAssets } from "@/utility/factory-site-utility";
import { InputText } from "primereact/inputtext";
import { FilterMatchMode } from "primereact/api";

interface AssetManagementDialogProps {
  assetManageDialogProp: boolean;
  setAssetManageDialogProp: Dispatch<SetStateAction<boolean>>;
}

const AssetManagementDialog: React.FC<AssetManagementDialogProps> = ({ assetManageDialogProp,
  setAssetManageDialogProp
}) => {
  const [assetData, setAssetData] = useState<Asset[]>([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [allAllocatedAssets, setAllAllocatedAssets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    factoryId: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  });
  const [globalFilterValue, setGlobalFilterValue] = useState('');
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

  const handleAllAllocatedAsset = async () => {
    try {
      const response = await fetchAllAllocatedAssets();
      console.log(response, "all response allocated");
      const allocatedAssets = [];
      response.forEach(({ id, "http://www.industry-fusion.org/schema#last-data": { object } }) => {
        allocatedAssets.push({ id: id, object: object });
        setAllAllocatedAssets(allocatedAssets)

      });
    } catch (error) {
      console.error(error)
    }
  }

  const data = allAllocatedAssets.map(item => {
    const factoryId = item.id.replace(/:allocated-assets$/, '');;
    const urnObject = item.object;
    let dataItem = { factoryId };

    urnObject.forEach((urn, index) => {
      dataItem[`urn_${index + 1}`] = urn;
    });

    return dataItem;
  });

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
   <button className="action-items-btn">
      <i className="pi pi-trash"></i>
   </button>
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
            value={globalFilterValue} onChange={onGlobalFilterChange}
            placeholder="Search" />
        </span>
      </div>
    );
  };
  const header = renderHeader();

  const maxUrnFields = data.reduce((max, item) => {
    const urnFields = Object.keys(item).filter(key => key.startsWith('urn_')).length;
    return Math.max(max, urnFields);
  }, 0);

  // Generate column definitions dynamically
  const urnColumns = Array.from({ length: maxUrnFields }, (_, i) => ({
    field: `urn_${i + 1}`,
    header: `URN ${i + 1}`,
  }));

  useEffect(() => {
    if (Cookies.get("login_flag") === "false") {
      router.push("/login");
    } else {
      if (router.isReady) {
        handleAsset();
        handleAllAllocatedAsset();
      }
    }
  }, [])

  return (
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
              <h3>Allocated Assets</h3>
              <DataTable
                style={{ zoom: "92%" }}
                className="factory-table"
                value={data} rowGroupMode="rowspan" showGridlines
                header={header}
                filters={filters}
                globalFilterFields={['factoryId', ...urnColumns.map(col => col.field)]}
                groupField="factoryId">
                <Column field="factoryId"
                  className="factory-id-text"
                  filter
                ></Column>
                {urnColumns.map((col, i) => (
                  <Column key={col.field}
                    filter
                    className="factory-urn-text"
                    field={col.field} />
                ))}
              </DataTable>
            </>
        }
      </div>

    </Dialog>
  )
}

export default AssetManagementDialog;