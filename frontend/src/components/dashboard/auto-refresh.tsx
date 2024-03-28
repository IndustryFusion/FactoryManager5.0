import { useDashboard } from "@/context/dashboard-context";
import { InputSwitch } from "primereact/inputswitch";
import "../../styles/dashboard.css"

const AutoRefresh = ()=>{
  const {autorefresh, setAutorefresh, selectedAssetData} = useDashboard();

    return(
        <>
         <div className="autorefresh-btn mr-5 flex justify-content-between">
         <h3 style={{ fontSize: "20px",marginLeft:"2.5rem" }}>
        {selectedAssetData?.product_name === undefined ?
          "Unknown Product" : selectedAssetData?.product_name
        }</h3>
        <div className="flex justify-content-center align-items-center">
        <span className="mr-2 autorefresh-text ">auto refresh</span>
            <InputSwitch 
             checked={autorefresh} onChange={(e) => setAutorefresh(e.value)}
            />
        </div>
         
        </div>
        </>
    )
}

export default AutoRefresh;