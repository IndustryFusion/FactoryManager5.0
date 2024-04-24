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
    const [focused, setFocused] = useState(false);
    const [inputValues, setInputValues] = useState({});
    const [getRelation, setGetRelation] = useState("");
    const [workPieceRelations, setWorkPieceRelations] = useState<string[]>([]);
    const [catridgeRelations, setCatridgeRelations] = useState<string[]>([]);
    const [workPieceAssetIds, setWorkPieceAssetIds] = useState<string[]>([]);
    const [catridgeAssetIds, setCatridgeAssetIds] = useState<string[]>([]);



    // setting values in input
    const selectItems = (item: string, assetCategory: string) => {
        console.log(getRelation, "getRelation");

        const relation = getRelation.replace("has", "").toLowerCase();
        const formattedAssetCategory = assetCategory.replace(/\s+/g, '').toLowerCase();
        if (formattedAssetCategory.includes(relation)) {
            if (getRelation === "hasWorkpiece") {
                setWorkPieceRelations(prevRelations => [...prevRelations, item]);
                //setWorkPieceAssetIds(prevRelations => [...prevRelations, id])
                //setIds
            }
            if (getRelation === "hasCatridge") {
                setCatridgeRelations(prevRelations => [...prevRelations, item]);
                //setCatridgeAssetIds(prevRelations => [...prevRelations, id])
                //setIds
            }
            else {
                setInputValues(prevValues => ({
                    ...prevValues,
                    [getRelation]: item
                    //setIds
                }));
                setFocused(false);
            }

        }
    };

    return (
        <FactoryShopFloorContext.Provider
            value={{             
                focused, setFocused,
                selectItems,
                inputValues, setInputValues,
                getRelation, setGetRelation,
                workPieceRelations, setWorkPieceRelations,
                catridgeRelations, setCatridgeRelations
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