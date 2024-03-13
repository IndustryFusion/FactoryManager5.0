import { fetchAsset } from "@/utility/asset-utility";
import React, {
    createContext,
    useContext,
    useState,
    ReactNode,
    useCallback,
    useEffect,
  } from "react";

const DashboardContext = createContext<undefined>(undefined);

export const DashboardProvider:React.FC<{ children: ReactNode }> = ({
    children,
  }) =>{
    const [entityIdValue, setEntityIdValue]=useState("");
    const [machineStateValue, setMachineStateValue] = useState("0");

    return(
        <DashboardContext.Provider
        value={{
           entityIdValue,
           setEntityIdValue,
           machineStateValue, 
           setMachineStateValue
          }}
      >
        {children}
      </DashboardContext.Provider> 
    )
  };

  export const useDashboard = () => {
    const context = useContext(DashboardContext);
    if (!context) {
      throw new Error("useDashboard must be used within a DashboardProvider");
    }
    return context;
  };
  