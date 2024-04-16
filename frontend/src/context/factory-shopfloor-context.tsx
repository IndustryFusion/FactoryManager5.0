import { ReactNode, useContext, createContext, useState } from "react";

const FactoryShopFloorContext = createContext<undefined>(undefined);

export const FactoryShopFloorProvider: React.FC<{ children: ReactNode }> = ({
    children,
}) => {

    const [shopfloor, setShopfloor] = useState({})
    return (
        <FactoryShopFloorContext.Provider
            value={{}}
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