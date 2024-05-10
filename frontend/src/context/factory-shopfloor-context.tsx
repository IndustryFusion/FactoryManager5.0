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
interface Obj {
    [key: string]: string | string[];
}
// Define the type for the context value
interface FactoryShopFloorContextValue {
    selectItems: (item: string, assetCategory: string, id: string) => void;
    inputValue: InputValue[];
    setInputValue: React.Dispatch<React.SetStateAction<InputValue[]>>;
    assetId: string;
    setAssetId: React.Dispatch<React.SetStateAction<string>>;
    asset: string;
    setAsset: React.Dispatch<React.SetStateAction<string>>;
    saveAllocatedAssets: boolean;
    setSaveAllocatedAssets: React.Dispatch<React.SetStateAction<boolean>>;
    shopFloorValue: Obj;
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
    const [saveAllocatedAssets, setSaveAllocatedAssets] = useState(false);
    const [shopFloorValue, setShopFloorValue] = useState({});


    const relations = useSelector((state: RootState) => state.relations.values);

    const selectItems = (item: string, assetCategory: string, id: string) => {
        console.log("selct items relations:", item, assetCategory)

        for (let getRelation of relations) {
            const relation = getRelation.replace("has", "").toLowerCase();
            const parts = assetCategory.split(" "); // Split the string into parts by space
            const formattedAssetCategory = parts[1].toLowerCase();

            if (formattedAssetCategory.includes(relation)) {

                setInputValue(prevValue => {
                    const updatedValue = [...prevValue];

                    if (getRelation === "hasCatridge" || getRelation === "hasWorkpiece") {

                        const emptyRelationindex = updatedValue.findIndex(entry => entry[getRelation] === "" && entry[`${getRelation}_asset`] === "");
                        const existingEntryIndex = updatedValue.findIndex(entry => entry[getRelation]);
                        const duplicatedexistingEntryIndex = updatedValue.findIndex(entry => entry[getRelation] && entry[`${getRelation}_asset`].includes(item));

                        if (emptyRelationindex >= 0) {
                            // If the entry exists, create a new object with the updated arrays
                            const existingEntry = updatedValue[emptyRelationindex];
                            const updatedEntry = {
                                ...existingEntry,
                                [getRelation]: [...existingEntry[getRelation], id],
                                [`${getRelation}_asset`]: [...existingEntry[`${getRelation}_asset`], item]
                            };
                            updatedValue[emptyRelationindex] = updatedEntry;
                        } else if (existingEntryIndex >= 0) {
                            const existingEntry = updatedValue[existingEntryIndex];
                            const updatedEntry = {
                                ...existingEntry,
                                [getRelation]: [...existingEntry[getRelation], id],
                                [`${getRelation}_asset`]: [...existingEntry[`${getRelation}_asset`], item]
                            };
                            updatedValue[existingEntryIndex] = updatedEntry;
                        }
                        if (duplicatedexistingEntryIndex !== -1) {
                            alert("entry exits");
                            return updatedValue;
                        }
                        else {
                            // If the entry doesn't exist, create a new one
                            updatedValue.push({
                                [getRelation]: [id],
                                [`${getRelation}_asset`]: [item]
                            });
                        }
                    } else {
                        const emptyRelationindex = updatedValue.findIndex(entry => entry[getRelation] === "" && entry[`${getRelation}_asset`] === "");
                        const existingEntryIndex = updatedValue.findIndex(entry => entry[getRelation]);

                        if (emptyRelationindex >= 0) {
                            const existingEntry = updatedValue[emptyRelationindex];
                            const updatedEntry = {
                                ...existingEntry,
                                [getRelation]: id,
                                [`${getRelation}_asset`]: item
                            };
                            updatedValue[emptyRelationindex] = updatedEntry;
                        } else if (existingEntryIndex >= 0) {
                            updatedValue[existingEntryIndex] = {
                                [getRelation]: id,
                                [`${getRelation}_asset`]: item
                            };
                        } else {
                            updatedValue.push({
                                [getRelation]: id,
                                [`${getRelation}_asset`]: item
                            });
                        }
                    }
                    console.log("updatedValue here", updatedValue);


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