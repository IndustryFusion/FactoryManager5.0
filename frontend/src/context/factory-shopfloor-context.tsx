import React, {
    createContext,
    useContext,
    useState,
    ReactNode,
    useEffect,
} from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/state/store";

interface InputValue {
    [key: string]: string | string[];
}
interface Obj{
   [key: string]: string | string[];
}
// Define the type for the context value
interface FactoryShopFloorContextValue {
    focused: boolean;
    setFocused: React.Dispatch<React.SetStateAction<boolean>>;
    selectItems: (item: string, assetCategory: string, id: string) => void;
    relations: string[];
    setRelations: React.Dispatch<React.SetStateAction<string[]>>;
    inputValue: InputValue[];
    setInputValue: React.Dispatch<React.SetStateAction<InputValue[]>>;
    assetId: string;
    setAssetId: React.Dispatch<React.SetStateAction<string>>;
    asset: string;
    setAsset: React.Dispatch<React.SetStateAction<string>>;
    saveAllocatedAssets:boolean;
    setSaveAllocatedAssets:React.Dispatch<React.SetStateAction<boolean>>;
    shopFloorValue:Obj;
    setShopFloorValue: React.Dispatch<React.SetStateAction<Obj>>;
}

const FactoryShopFloorContext = createContext<FactoryShopFloorContextValue | undefined>(undefined);

export const FactoryShopFloorProvider: React.FC<{ children: ReactNode }> = ({
    children,
}) => {

    const [inputValue, setInputValue] = useState<InputValue[]>([]);
    const [assetId, setAssetId] = useState("");
    const [asset, setAsset] = useState({});
    const [shownToast, setShownToast] = useState(false);
    const [saveAllocatedAssets, setSaveAllocatedAssets]=useState(false);
    const [shopFloorValue, setShopFloorValue]=useState({});
    

    const relations = useSelector((state: RootState) => state.relations.values);

    const selectItems = (item: string, assetCategory: string, id: string) => {
 
        for(let getRelation of relations){
            const relation = getRelation.replace("has", "").toLowerCase();
            console.log(relation, "in select items");
            const formattedAssetCategory = assetCategory.replace(/\s+/g, '').toLowerCase();
            if (formattedAssetCategory.includes(relation)) {
    
                setInputValue(prevValue => {
                    // Create a new array to hold the updated state
                    const updatedValue = [...prevValue];
    
                    if (getRelation === "hasCatridge" || getRelation === "hasWorkpiece") {
                        const existingEntryIndex = updatedValue.findIndex(entry => entry[getRelation]);
                        if (existingEntryIndex !== -1) {
                            // If the entry exists, create a new object with the updated arrays
                            const existingEntry = updatedValue[existingEntryIndex];
                            const updatedEntry = {
                                ...existingEntry,
                                [getRelation]: [...existingEntry[getRelation], id],
                                [`${getRelation}_asset`]: [...existingEntry[`${getRelation}_asset`], item]
                            };
                            updatedValue[existingEntryIndex] = updatedEntry;
                        } else {
                            // If the entry doesn't exist, create a new one
                            updatedValue.push({
                                [getRelation]: [id],
                                [`${getRelation}_asset`]: [item]
                            });
                        }
                    } else {
                        // For other relations, simply add a new object to the array
                        const existingEntryIndex = updatedValue.findIndex(entry => entry[getRelation]);
                        if (existingEntryIndex !== -1) {
                            // If the entry exists, update it
                            const existingEntry = updatedValue[existingEntryIndex];
                            const updatedEntry = {
                                ...existingEntry,
                                [getRelation]: id,
                                [`${getRelation}_asset`]: item
                            };
                            updatedValue[existingEntryIndex] = updatedEntry;
                        } else {
                            // If the entry doesn't exist, create a new one
                            updatedValue.push({
                                [getRelation]: id,
                                [`${getRelation}_asset`]: item
                            });
                        }
                    }
    
                    return updatedValue;
                });       
            }
        }

    }
    
  


    return (
        <FactoryShopFloorContext.Provider
            value={{
                selectItems,                       
                inputValue, setInputValue,
                assetId, setAssetId,
                asset, setAsset,
                shownToast, setShownToast,
                shopFloorValue, setShopFloorValue,
                saveAllocatedAssets, setSaveAllocatedAssets
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