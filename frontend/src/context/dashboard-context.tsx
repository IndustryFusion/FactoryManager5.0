
import React, {
    createContext,
    useContext,
    useState,
    ReactNode,
    useCallback,
    useEffect,
  } from "react";


  interface MachineStateDataValue {
    length: number;
    reverse: () => void;
    find: (predicate: (value: any, index: number, obj: any[]) => boolean) => any;
   }
   
   interface MachineStateData {
    [key: string]: MachineStateDataValue;
   }

  interface DashboardContextValue {
    entityIdValue: string;
    setEntityIdValue: React.Dispatch<React.SetStateAction<string>>;
    machineStateValue: string;
    setMachineStateValue: React.Dispatch<React.SetStateAction<string>>;
    blocker: boolean;
    setBlocker: React.Dispatch<React.SetStateAction<boolean>>;
    selectedAssetData: {}; // Adjust the type as necessary
    setSelectedAssetData: React.Dispatch<React.SetStateAction<{}>>; // Adjust the type as necessary
    machineStateData: MachineStateData; 
    setMachineStateData:React.Dispatch<React.SetStateAction<{}>> ;
   }
   
const DashboardContext = createContext<DashboardContextValue | undefined>(undefined);

export const DashboardProvider:React.FC<{ children: ReactNode }> = ({
    children,
  }) =>{
    const [entityIdValue, setEntityIdValue]=useState("");
    const [machineStateValue, setMachineStateValue] = useState("0");
    const [blocker, setBlocker]= useState(false);
    const [selectedAssetData, setSelectedAssetData] = useState({});
    const [machineStateData, setMachineStateData]= useState({});

    return(
        <DashboardContext.Provider
        value={{
           entityIdValue,
           setEntityIdValue,
           machineStateValue, 
           setMachineStateValue,
           blocker, setBlocker,
           selectedAssetData, setSelectedAssetData,
           machineStateData, setMachineStateData
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
  