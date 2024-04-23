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
    // const relations = {
    //     "hasTracker": "Air tracker",
    //     "hasFilter": "Air filter",
    //     "hasCatridge": "Filter Catridge",
    //     "hasSource": "",
    //     "hasWorkpiece":""   
    // }

    const [inputValue, setInputValue] = useState("");
    const [focused, setFocused] = useState(false);
    const [inputValues, setInputValues] = useState({});
    const [getRelation, setGetRelation] = useState("");
    const [workPieceRelations, setWorkPieceRelations] =  useState<string[]>([]);
    const [catridgeRelations, setCatridgeRelations] =  useState<string[]>([]);


    const selectItem = (item: string) => {
        setInputValue(item);
        setFocused(false);
    };

    const selectItems = (item: string, assetCategory: string) => {
        console.log(getRelation, "getRelation");
        
        const relation = getRelation.replace("has", "").toLowerCase();
        const formattedAssetCategory = assetCategory.replace(/\s+/g, '').toLowerCase();
        if (formattedAssetCategory.includes(relation)) {
            if(getRelation === "hasWorkpiece"){
                setWorkPieceRelations(prevRelations => [...prevRelations, item]);
            }
            if(getRelation === "hasCatridge"){
                setCatridgeRelations(prevRelations => [...prevRelations, item]);
            }
            
            else{
                setInputValues(prevValues => ({
                    ...prevValues,
                    [getRelation]: item
                }));        
                setFocused(false);
            }
           
        }
    };

    console.log("workPieceRelations",workPieceRelations );
    
     

    return (
        <FactoryShopFloorContext.Provider
            value={{
                inputValue, setInputValue,
                focused, setFocused,
                selectItem,
                selectItems,
                inputValues, setInputValues,
                getRelation, setGetRelation,
                workPieceRelations, setWorkPieceRelations
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