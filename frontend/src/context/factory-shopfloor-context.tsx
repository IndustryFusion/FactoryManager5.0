import { ReactNode, useContext, createContext, useState } from "react";


interface FactoryShopFloorValue {
    shopfloor: { [key: string]: any; };
    setShopfloor: React.Dispatch<React.SetStateAction<{ [key: string]: any; }>>;
}

const FactoryShopFloorContext = createContext<FactoryShopFloorValue | undefined>(undefined);


export const FactoryShopFloorProvider: React.FC<{ children: ReactNode }> = ({
    children,
}) => {

    const [shopfloor, setShopfloor] = useState({})
    return (
        <FactoryShopFloorContext.Provider
            value={{
                shopfloor, setShopfloor
            }}
        >
            {children}
        </FactoryShopFloorContext.Provider>
    )
}

export const useFactoryShopFloor = () => {
    const context = useContext(FactoryShopFloorContext);
    if (!context) {
        throw new Error("useFactoryShopFloor must be used within a FactoryShopFloorProvider");
    }
    return context;

}