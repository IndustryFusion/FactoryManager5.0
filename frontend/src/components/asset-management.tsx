
import { Dialog } from "primereact/dialog";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/router";
import { fetchAsset } from "@/utility/asset-utility";
import { Asset } from "@/interfaces/asset-types";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import "../styles/dashboard.css"



interface AssetManagementDialogProps {
  assetManageDialogProp: boolean;
  setAssetManageDialogProp: Dispatch<SetStateAction<boolean>>;
}

const AssetManagementDialog: React.FC<AssetManagementDialogProps> = ({ assetManageDialogProp,
  setAssetManageDialogProp
}) => {
  const [assetData, setAssetData] = useState<Asset[]>([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const router = useRouter();

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
      // console.error(error)
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

  const headerElement = (
    <h3 className="px-5"> Asset Management</h3>
  )

  useEffect(() => {
    if (Cookies.get("login_flag") === "false") {
      router.push("/login");
    } else {
      if (router.isReady) {
        handleAsset()
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

        </DataTable>
      </div>

    </Dialog>
  )
}

export default AssetManagementDialog;