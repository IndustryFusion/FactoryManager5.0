
// 
// Copyright (c) 2024 IB Systems GmbH 
// 
// Licensed under the Apache License, Version 2.0 (the "License"); 
// you may not use this file except in compliance with the License. 
// You may obtain a copy of the License at 
// 
//    http://www.apache.org/licenses/LICENSE-2.0 
// 
// Unless required by applicable law or agreed to in writing, software 
// distributed under the License is distributed on an "AS IS" BASIS, 
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. 
// See the License for the specific language governing permissions and 
// limitations under the License. 
// 

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
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
  selectedAssetData: { [key: string]: any; }; // Adjust the type to include an index signature
  setSelectedAssetData: React.Dispatch<React.SetStateAction<{ [key: string]: any; }>>; // Adjust the type to include an index signature
  machineStateData: MachineStateData;
  setMachineStateData: React.Dispatch<React.SetStateAction<{}>>;
  assetCount:number,
  setAssetCount: React.Dispatch<React.SetStateAction<number>>
  notificationData: any[]; 
  setNotificationData: React.Dispatch<React.SetStateAction<any[]>>; 
  allOnlineTime: any[]; 
  setAllOnlineTime: React.Dispatch<React.SetStateAction<any[]>>; 
  relationsCount: number; 
  setRelationsCount: React.Dispatch<React.SetStateAction<number>>;
}

const DashboardContext = createContext<DashboardContextValue | undefined>(undefined);

export const DashboardProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [entityIdValue, setEntityIdValue] = useState("");
  const [machineStateValue, setMachineStateValue] = useState("0");
  const [blocker, setBlocker] = useState(false);
  const [selectedAssetData, setSelectedAssetData] = useState<{ [key: string]: any; }>({});
  const [machineStateData, setMachineStateData] = useState({});
  const [notificationData, setNotificationData] =useState<any[]>([]);
  const [allOnlineTime, setAllOnlineTime]= useState<any[]>([]); 
  const [relationsCount, setRelationsCount] = useState<number>(0);
  const [assetCount, setAssetCount] = useState<number>(0);

  return (
    <DashboardContext.Provider
      value={{
        entityIdValue,
        setEntityIdValue,
        machineStateValue,
        setMachineStateValue,
        blocker, setBlocker,
        selectedAssetData, setSelectedAssetData,
        machineStateData, setMachineStateData,
        notificationData, setNotificationData,
        allOnlineTime, setAllOnlineTime,
        relationsCount, setRelationsCount,
        assetCount, setAssetCount
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
