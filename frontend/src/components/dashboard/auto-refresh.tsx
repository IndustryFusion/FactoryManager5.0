import { useDashboard } from "@/context/dashboard-context";
import { InputSwitch } from "primereact/inputswitch";
import "../../styles/dashboard.css"

const AutoRefresh = () => {
  const { selectedAssetData } = useDashboard();

  return (
    <>
      <div className="autorefresh-btn mr-5 flex justify-content-between">
        {selectedAssetData?.product_name === undefined ?
          <h3 style={{ fontSize: "18px", marginLeft: "2.5rem" }}> Unknown Product</h3>
          :
          <h3 style={{ fontSize: "18px", marginLeft: "2.5rem" }}>
            <span>  {`${selectedAssetData?.product_name} :`}</span>
            <span style={{ textTransform: "lowercase" }}>{` ${selectedAssetData?.id}`}</span>
          </h3>
        }
      </div>
    </>
  )
}

export default AutoRefresh;