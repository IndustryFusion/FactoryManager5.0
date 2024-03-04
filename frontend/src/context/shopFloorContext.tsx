import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from "react";

interface ShopFloor {
  id: string;
  name: string;
}

interface ShopFloorContextType {
  shopFloors: ShopFloor[];
  addShopFloor: (shopFloor: ShopFloor) => void;
  latestShopFloor: ShopFloor | null; // Add this line
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
  ); // Add this line

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
