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

import { useDashboard } from "@/context/dashboard-context";
import axios from "axios";
import { Dialog } from "primereact/dialog";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import "../../styles/relation-container.css"
import { getAssetById } from "@/utility/factory-site-utility";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

interface RelationPopupProps {
    relationsProp: boolean;
    setRelationsProp: Dispatch<SetStateAction<boolean>>;
}

interface ParentRelationData {
    product_name: { value: string };
    id: string;
    asset_category: { value: string };
    object?: string;
    type?:string
}


const RelationDialog: React.FC<RelationPopupProps> = ({ relationsProp, setRelationsProp }) => {
    const [parentRelations, setParentRelations] = useState<ParentRelationData[]>([]);
    const { selectedAssetData, entityIdValue } = useDashboard();
    const [hasPropertiesArray, setHasPropertiesArray] = useState<{[key:string]:string[]}[]>([]);


    const getAssetData = async (relationData:ParentRelationData  ) => {
        try {
            let newArr = [];
            if (Array.isArray(relationData) && relationData.length > 0) {
                for (let item of relationData) {
                    const response = await getAssetById(item?.object);  
                    const productKey = Object.keys(response).find(key => key.includes("product_name"));                
                    let product_name = productKey ? response[productKey]?.value : undefined;
                    newArr.push(product_name);
                }
            }
             else if (relationData.object && relationData.object !== "json-ld-1.1") {
                const response = await getAssetById(relationData?.object);
                const productKey = Object.keys(response).find(key => key.includes("product_name"));
                let product_name = productKey ? response[productKey]?.value : undefined;
                newArr.push(product_name);
            }
            return newArr;
        } catch (error) {
            console.error(error)
        }
    }


    const getHasProperties = async () => {
        const propertiesArray: { [key: string]: string[] }[] = [];
        for (const key in selectedAssetData) {
            if (key.startsWith("has")) {
                const propertyName = key.substring(3); // Remove the "has" prefix
                const propertyValue = selectedAssetData[key];
                let dataValues = await getAssetData(propertyValue) || [];
                propertiesArray.push({ [propertyName]: dataValues });
            }
        }
        setHasPropertiesArray(propertiesArray)
    }

    const relationParent = async () => {
        try {
            const response = await axios.get(API_URL + "/asset/parent-ids", {
                params: {
                    "asset-id": selectedAssetData?.id,
                    "asset-category": selectedAssetData?.asset_category
                },
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                withCredentials: true,
            });
       
            setParentRelations(response.data)
        } catch (error) {
            console.error(error)
        }
    }

    const Header = (
        <h3 className="pl-4">Relations</h3>
    )

    useEffect(() => {
        relationParent();
        getHasProperties();
    }, [selectedAssetData])




    return (
        <>
            <Dialog header={Header}

                visible={relationsProp} style={{ width: '45vw' }} onHide={() => setRelationsProp(false)}>
                <div className="flex gap-3 relation-dialog">
                    <div style={{ flex: "40%" }}>
                        <h4 className="m-0 mb-3 child-heading">Child</h4>
                        {hasPropertiesArray.map((property, index) => {
                            const key = Object.keys(property)[0];
                            const value = property[key];
                            return (
                                <div key={index} className="mb-2 flex flex-column ">
                                    <div className="mb-2 relation-container">
                                        <div className="flex gap-2">
                                            <div className="child-bullet-point"></div>
                                            <h4 className="child-key-text m-0 mb-1">{key}</h4>
                                        </div>
                                        <p className="ml-2 child-key-value m-0">{value?.length === 1 && value[0]}</p>
                                        {/* workpiece ,catridge relation */}
                                        {
                                            value?.length > 1 &&
                                            <ul
                                                className="m-0 p-0"
                                                style={{ listStyle: "circle" }}
                                            >
                                                {value?.map((item, index) => {
                                                    return (
                                                        <>
                                                            <li
                                                                className="ml-4 child-key-value"
                                                                key={index}>{item}</li>
                                                        </>
                                                    )
                                                }
                                                )}
                                            </ul>
                                        }
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    <div style={{ flex: "20%" }} className="parent-child-icon">
                        <img src="/parent_child2.png" alt="" width="50px" height="auto" />
                    </div>
                    <div style={{ flex: "40%" }}>
                        <h4 className="m-0 mb-3 parent-heading">Parent</h4>
                        {parentRelations.map((item, index) => {
                            const { product_name, id, asset_category } = item;
                            return (
                                <>
                                    <div className="flex gap-2 relation-container">
                                        <div className="bullet-point"></div>
                                        <div>
                                            <h4 className="parent-key-text m-0 mb-1">{product_name?.value}</h4>
                                            <ul className=" m-0">
                                                <li className="child-key-value">{id}</li>
                                                <li className="child-key-value">{asset_category?.value}</li>
                                            </ul>
                                        </div>
                                    </div>
                                </>
                            )
                        })
                        }
                    </div>
                </div>

            </Dialog>
        </>
    )
}

export default RelationDialog;