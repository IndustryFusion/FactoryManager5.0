import { useDashboard } from "@/context/dashboard-context";
import { InputSwitch } from "primereact/inputswitch";

const AutoRefresh = ()=>{
  const {autorefresh, setAutorefresh} = useDashboard();

  console.log("autorefresh", autorefresh);
  

    return(
        <>
         <div className="autorefresh-btn mr-5 flex justify-content-end">
            <InputSwitch 
             checked={autorefresh} onChange={(e) => setAutorefresh(e.value)}
            />
        </div>
        </>
    )
}

export default AutoRefresh;