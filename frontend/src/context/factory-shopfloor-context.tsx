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
    const relations = {
        "hasTracker": "Air tracker",
        "hasFilter": "Air filter",
       
    }

    const [inputValue, setInputValue] = useState("");
    const [focused, setFocused] = useState(false);
    const [inputValues, setInputValues] = useState({});
 

    const selectItem = (item) => {
        setInputValue(item);
        setFocused(false);
    };


    const selectItems = (item, assetCategory) => {
        console.log(item, assetCategory, "geteting hre values");

        for (let relation in relations) {
            console.log("relations[relation]", relations[relation]);
            if(relations[relation] == assetCategory){
                console.log("is coming here");
                
                setInputValues(prevValues => ({
                    ...prevValues,
                    [relation]: item
                }));  
                setFocused(false);
            }         
        }
    };


  


    return (
        <FactoryShopFloorContext.Provider
            value={{
                inputValue, setInputValue,
                focused, setFocused,
                selectItem,
                selectItems,
                inputValues, setInputValues
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