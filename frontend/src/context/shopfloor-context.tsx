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
  useCallback,
} from "react";

interface ShopFloor {
  id: string;
  name: any;
}

interface ShopFloorContextType {
  shopFloors: ShopFloor[];
  addShopFloor: (shopFloor: ShopFloor) => void;
  latestShopFloor: ShopFloor | null;
}

const ShopFloorContext = createContext<ShopFloorContextType | undefined>(
  undefined
);

export const ShopFloorProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [shopFloors, setShopFloors] = useState<ShopFloor[]>([]);
  const [latestShopFloor, setLatestShopFloor] = useState<ShopFloor | null>(
    null
  );

  const addShopFloor = (shopFloor: ShopFloor) => {
    setShopFloors((prev) => [...prev, shopFloor]);
    setLatestShopFloor(shopFloor); // Update the latestShopFloor whenever a new one is added
  };

  return (
    <ShopFloorContext.Provider
      value={{ shopFloors, addShopFloor, latestShopFloor }}
    >
      {children}
    </ShopFloorContext.Provider>
  );
};

export const useShopFloor = () => {
  const context = useContext(ShopFloorContext);
  if (!context) {
    throw new Error("useShopFloor must be used within a ShopFloorProvider");
  }
  return context;
};
