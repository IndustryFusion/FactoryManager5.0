import React, {
    createContext,
    useContext,
    useState,
    ReactNode,
} from "react";

interface InputValue {
    [key: string]: string | string[];
}

// Define the type for the context value
interface FactoryShopFloorContextValue {
    focused: boolean;
    setFocused: React.Dispatch<React.SetStateAction<boolean>>;
    selectItems: (item: string, assetCategory: string, id: string) => void;
    getRelation: string;
    setGetRelation: React.Dispatch<React.SetStateAction<string>>;
    inputValue: InputValue[];
    setInputValue: React.Dispatch<React.SetStateAction<InputValue[]>>;
    assetId: string;
    setAssetId: React.Dispatch<React.SetStateAction<string>>;
    asset:string;
    setAsset: React.Dispatch<React.SetStateAction<string>>;
}

const FactoryShopFloorContext = createContext<FactoryShopFloorContextValue | undefined>(undefined);

export const FactoryShopFloorProvider: React.FC<{ children: ReactNode }> = ({
    children,
}) => {

    const [getRelation, setGetRelation] = useState("");
    const [focused, setFocused] = useState(false);
    const [inputValue, setInputValue] = useState<InputValue[]>([]);
    const [assetId, setAssetId] = useState("");
    const [asset, setAsset] = useState({});




    const selectItems = (item: string, assetCategory: string, id: string) => {
        console.log(item, "item here");
        const relation = getRelation.replace("has", "").toLowerCase();
        const formattedAssetCategory = assetCategory.replace(/\s+/g, '').toLowerCase();
        if (formattedAssetCategory.includes(relation)) {
            
            if (getRelation === "hasCatridge" || getRelation === "hasWorkpiece") {
                setInputValue(prevValue => {
                    // Find the existing entry for the relation or create a new one
                    const existingEntry = prevValue.find(entry => entry[getRelation]);
                    console.log("existing" ,existingEntry );
                    console.log("wkp item", item)
                    if (existingEntry) {
                        // If the entry exists, append to the arrays
                        existingEntry[getRelation].push(id);
                        existingEntry[`${getRelation}_asset`].push(item);
                    } else {
                        // If the entry doesn't exist, create a new one
                        prevValue.push({
                            [getRelation]: [id],
                            [`${getRelation}_asset`]: [item]
                        });
                    }
                    return prevValue
                });

                setFocused(false);
            } else {
                setInputValue(prevValue => [...prevValue, {
                    [getRelation]: id,
                    [`${getRelation}_asset`]: item
                }
                ]);
                setFocused(false);
            }
        }
    }


    return (
        <FactoryShopFloorContext.Provider
            value={{
                focused, setFocused,
                selectItems,
                getRelation, setGetRelation,
                inputValue, setInputValue,
                assetId, setAssetId,
                asset, setAsset
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