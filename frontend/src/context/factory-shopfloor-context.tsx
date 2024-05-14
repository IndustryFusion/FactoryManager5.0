// 
// Copyright (c) 2024 IB Systems GmbH 
// 
// Licensed under the Apache License, Version 2.0 (the "License"); 
// you may not use this file except in compliance with the License. 
// You may obtain a copy of the License at 
// 
//    http://www.apache.org/licenses/LICENSE-2.0 
// 
// Unless required by applicable law or agreed to in writing, software 
// distributed under the License is distributed on an "AS IS" BASIS, 
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. 
// See the License for the specific language governing permissions and 
// limitations under the License. 
// 

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
                        const isEntryExists:any  = existingEntryIndex >= 0 ? updatedValue[existingEntryIndex] : null;

                        const isDuplicateItem = isEntryExists && isEntryExists[getRelation].includes(id);
                        console.log("isDuplicateItem", isDuplicateItem);
                        
                      
                        if (emptyRelationindex >= 0) {                           
                                const existingEntry = updatedValue[emptyRelationindex];
                                const updatedEntry = {
                                    ...existingEntry,
                                    [getRelation]: [...existingEntry[getRelation], id],
                                    [`${getRelation}_asset`]: [...existingEntry[`${getRelation}_asset`], item]
                                };
                                updatedValue[emptyRelationindex] = updatedEntry;                          
                        } else if (existingEntryIndex >= 0) {
                            if (!isDuplicateItem) { // Only update if it's not a duplicate item
                                const updatedEntry = {
                                    ...isEntryExists,
                                    [getRelation]: [...isEntryExists[getRelation], id],
                                    [`${getRelation}_asset`]: [...isEntryExists[`${getRelation}_asset`], item]
                                };
                                updatedValue[existingEntryIndex] = updatedEntry;
                            }else{
                                
                            }
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