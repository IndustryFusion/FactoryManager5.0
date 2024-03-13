import { useEffect, useState } from "react";
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

const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

const DashboardAssets = () => {
  const [assetData, setAssetData] = useState<Asset[]>([]);
  const [showBlocker, setShowBlocker] = useState(false);
  const router = useRouter();

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
        console.log(response, "all assets");
        
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
        const {} = router.query;
        handleAsset();
      }
    }  
  }, [router.isReady])


  const handleClick = (selectedAsset: Asset) => {
    const prefix = "http://www.industry-fusion.org/fields#";
    const allKeys = Object.keys(selectedAsset);
    const prefixedKeys = allKeys.filter(key => key.startsWith(prefix));

    if (prefixedKeys.length > 0) {
      setShowBlocker(false);
    } else {
      setShowBlocker(true);
    }
  };


  return (
    <div style={{zoom:"80%"}}>
      <div className="dashboard-assets" style={{width:"100%"}}>
        <div className="card h-auto" style={{width:"100%"}}>
          <h5 className="heading-text">Assets</h5>
          <DataTable
            rows={5}
            paginator
            value={assetData}
            className="dashboard-assets"
            scrollable={true}
            scrollHeight="750px"
            onRowClick={(e) => handleClick(e.data as Asset)}
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
        <div className="card flex justify-content-center">
          <Dialog visible={showBlocker} modal
            position="top"
            style={{ width: '40rem' }} onHide={() => setShowBlocker(false)}
            draggable={false} resizable={false}
          >
            <p className="m-0">
              Please onboard the asset gateway before moving to dashboard.  </p>
            <p className="m-0 mt-1">After onboarding click 'finish' button</p>
            <div>
              <div className="finish-btn">
                <Button
                  label="Finish" onClick={() => setShowBlocker(false)} autoFocus />
              </div>
            </div>
          </Dialog>
        </div>
      }
    </div>
  )
}

export default DashboardAssets;