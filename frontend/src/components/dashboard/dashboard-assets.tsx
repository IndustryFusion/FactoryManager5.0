
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { Asset } from "@/interfaces/assetTypes";
import { fetchAsset } from "@/utility/asset-utility";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import "../../styles/dashboard.css"
import { useRouter } from "next/router";
import axios from "axios";
import { Dialog } from "primereact/dialog";
import Cookies from "js-cookie";
import { useDashboard } from "@/context/dashboardContext";
import OnboardForm from "./onboard-form";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

interface DashboardAssetsProps {
  setBlockerProp: Dispatch<SetStateAction<boolean>>
  setPrefixedAssetPropertyProp: any
}

const DashboardAssets: React.FC<DashboardAssetsProps> = ({ setBlockerProp, setPrefixedAssetPropertyProp }) => {
  const [assetData, setAssetData] = useState<Asset[]>([]);
  const [showBlocker, setShowBlocker] = useState(false);
  const [selectedRow, setSelectedRow] = useState({});
  const [assetFlag, setAssetFlag] = useState(false)
  const router = useRouter();
  const dataTableRef = useRef(null);

  const { entityIdValue, setEntityIdValue, machineStateValue,
    setMachineStateValue, selectedAssetData, setSelectedAssetData } = useDashboard();

  const productNameBodyTemplate = (rowData: any) => {
    return <>{rowData?.product_name}</>;
  };
  const assetTypeBodyTemplate = (rowData: any) => {
    const assetType = rowData?.type?.split('/')[5];
    return <>{assetType}</>;
  };
  const productIconTemplate = (rowData: any) => {
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

  const handleAsset = async () => {
    try {
      const response = await fetchAsset();
      if (response !== undefined) {
        setAssetData(response);
        // console.log(response, "allresponse");
        setAssetFlag(true);
      } else {
        console.error("Fetch returned undefined");
      }
    } catch (error) {
      console.error(error)
    }
  }


  useEffect(() => {
    if (Cookies.get("login_flag") === "false") {
      router.push("/login");
    } else {
      if (router.isReady) {
        const { } = router.query;
        handleAsset();
        if (dataTableRef.current) {
          if (assetData?.length > 0 && assetFlag) {
            // console.log("is coming here");
            // console.log("first object value", newRowData[0]);
            setSelectedRow(assetData[0]);
            setEntityIdValue(assetData[0].id);
          }
        }
      }
    }
  }, [router.isReady, assetFlag])



  const handleClick = (selectedAsset: Asset) => {
    const prefix = "http://www.industry-fusion.org/fields#";
    const allKeys = Object.keys(selectedAsset);
    const prefixedKeys = allKeys.filter(key => key.startsWith(prefix));

    setSelectedRow(selectedAsset);
    setPrefixedAssetPropertyProp(prefixedKeys);
    setEntityIdValue(selectedAsset?.id);
    console.log(selectedAsset, "what's the asset here");
    setSelectedAssetData(selectedAsset)
    // console.log(prefixedKeys, "what's here");
    // console.log(prefixedKeys.length, "the length of prefix");

    if (prefixedKeys.length > 0) {
      setShowBlocker(false);
      setEntityIdValue(selectedAsset?.id);
      setSelectedAssetData(selectedAsset)

    } else {
      setShowBlocker(true);
    }

    if (prefix) {
      setMachineStateValue(selectedAsset["http://www.industry-fusion.org/fields#machine-state"]?.value)
    }
  };

  console.log("selectedRow value here", selectedRow);
  // console.log("entityIdValue of selected asset", entityIdValue );


  return (
    <div style={{ zoom: "80%" }}>
      <div className="dashboard-assets" style={{ width: "100%" }}>
        <div className="card h-auto " style={{ width: "100%" }}>
          <h5 className="heading-text">Assets</h5>
          <DataTable
            ref={dataTableRef}
            rows={5}
            paginator
            value={assetData}
            className="dashboard-assets"
            scrollable={true}
            scrollHeight="750px"
            onRowClick={(e) => handleClick(e.data as Asset)}
            selectionMode="single"
            selection={selectedRow}
            onSelectionChange={(e) => setSelectedRow(e.value)}

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
              header="View"
              style={{ width: '15%' }}
              body={() => (
                <>
                  <Button icon="pi pi-search" text />
                </>
              )}
            />
          </DataTable>
        </div>
      </div>
      {showBlocker &&
        <OnboardForm
          showBlockerProp={showBlocker}
          setShowBlockerProp={setShowBlocker}
          asset={selectedAssetData}
          setBlocker={setBlockerProp}
        />
      }
    </div>
  )
}

export default DashboardAssets;