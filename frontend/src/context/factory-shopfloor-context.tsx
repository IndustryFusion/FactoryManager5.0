import React, {
    createContext,
    useContext,
    useState,
    ReactNode,
} from "react";


const FactoryShopFloorContext = createContext(undefined);

export const FactoryShopFloorProvider: React.FC<{ children: ReactNode }> = ({
    children,
}) => {
    const [inputValue, setInputValue] = useState("");
    const [focused, setFocused] = useState(false);

    const selectItem = (item) => {
        setInputValue(item);
        setFocused(false);
    };

    console.log("is focused", focused);
    

    return (
        <FactoryShopFloorContext.Provider
            value={{ inputValue, setInputValue,
                focused, setFocused,
                selectItem
             }}
        >
            {children}
        </FactoryShopFloorContext.Provider>
    )
}

export const useFactoryShopFloor = () => {
    const context = useContext(FactoryShopFloorContext);
    if (!context) {
        throw new Error("FactoryShopFloorContext must be used within a FactoryShopFloorProvider");
    }
    return context;
}