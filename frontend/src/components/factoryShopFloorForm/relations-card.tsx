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

import React, { useEffect, useRef, useState } from "react";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { InputText } from "primereact/inputtext";
import { getAssetRelationById, fetchAssetDetailById } from "@/utility/factory-site-utility";
import { useFactoryShopFloor } from "@/context/factory-shopfloor-context";
import { Chips } from "primereact/chips";
import axios from "axios";
import { Toast, ToastMessage } from "primereact/toast";
import { useRouter } from "next/router";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/redux/store";
import { create, reset } from '@/redux/relations/relationsSlice';
import { useTranslation } from "next-i18next";
interface RelationObject {
    type: string;
    object: {};
}
interface Payload {
    [key: string]: RelationObject | RelationObject[];
}
interface RelationUpdate {
    [key: string]: string[] | string | undefined;
}
interface RelationData {
    [key: string]: string | string[];
}
const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

const Relations = () => {
    const {
        inputValue,
        setInputValue,
        assetId,
    } = useFactoryShopFloor();

    const [factoryId, setFactoryId] = useState("");
    const [deleteRelation, setDeleteRelation] = useState(false);
    const toast = useRef<Toast>(null);
    const router = useRouter();
    const allRelationAssetIds: string[] = [];
    const dispatch = useDispatch();
    const relations = useSelector((state: RootState) => state.relations.values);
    const reduxAssetId = useSelector((state: RootState) => state.relations.id);
    const [resetData, setResetData] = useState(false);
    const [focus, setFocus] = useState(false);
    const { t } = useTranslation('button');

    const getRelations = async () => {
        try {
            const response = await getAssetRelationById(assetId);
            if ( response && Object.keys(response).length > 0) {
                const relationsValues = Object.keys(response);
                if (relations.length == 0 || assetId !== reduxAssetId) {
                    dispatch(reset());
                    dispatch(create({
                        id: assetId,
                        values: relationsValues
                    }));
                }
                const allRelationsData = Object.fromEntries(Object.entries(response).map(([key, { objects }]) => [key, objects]));

                const allNewArr:RelationUpdate[] = [];
                let updateArr:RelationUpdate[]= [];

                for (let relation in allRelationsData) {
                    const values = allRelationsData[relation];

                    if (relation === "hasCatridge" || relation === "hasWorkpiece") {
                        const newArr = await Promise.all(values?.map(async (value, index) => {
                            if (value === 'json-ld-1.1') {
                                updateArr = [...updateArr, {
                                    [relation]: [],
                                    [`${relation}_asset`]: []
                                }];
                            } else {
                                const response = await fetchAssetDetailById(value);
                                const { product_name, id } = response ?? {};
                                const getIndex = updateArr.findIndex(item => Object.keys(item).includes(relation));
                                // const assetName = [`${relation}_asset`];
                                const assetName = `${relation}_asset`;

                                if (getIndex >= 0) {
                                    updateArr[getIndex] = {
                                        [relation]: [...updateArr[getIndex][relation] as string[], id],
                                        [`${relation}_asset`]: [...updateArr[getIndex][assetName] as string[], product_name]
                                    }

                                } else {
                                    updateArr = [...updateArr, {
                                        [relation]: [id],
                                        [`${relation}_asset`]: [product_name]
                                    }];
                                }
                            }

                            return updateArr;
                        }))
                        allNewArr.push(...newArr.flat());
                    } else {

                        const newArr = await Promise.all(values?.map(async (value) => {
                            if (value === 'json-ld-1.1') {
                                updateArr = [...updateArr, {
                                    [relation]: "",
                                    [`${relation}_asset`]: ""
                                }];
                            } else {
                                const response = await fetchAssetDetailById(value);
                                const { product_name, id, asset_category } = response ?? {};
                                updateArr = [...updateArr, {
                                    [relation]: id,
                                    [`${relation}_asset`]: product_name
                                }];
                            }
                            return updateArr;
                        }))
                        allNewArr.push(...newArr.flat());
                    }
                }
                const uniqueArr = [...new Set(allNewArr.map(obj => JSON.stringify(obj)))].map(str => JSON.parse(str));
                setInputValue(uniqueArr);

            } else {
                console.error("Response is undefined");
                dispatch(reset());
            }
        } catch (error) {
            console.error(error);
        }
    }

    useEffect(() => {
        getRelations();
    }, [assetId, relations, resetData]);

    useEffect(() => {
        const id = Array.isArray(router.query.factoryId) ? router.query.factoryId[0] :
            router.query.factoryId;
        if (typeof id === 'string') {
            setFactoryId(id)
        }
    }, [router.query.factoryId, router.isReady])


    const showToast = (severity: ToastMessage['severity'], summary: string, message: string) => {
        toast.current?.show({ severity: severity, summary: summary, detail: message, life: 5000 });
    };

    async function updateReactFlow(factoryId: string) {
        const reactFlowUpdate = `${API_URL}/react-flow/react-flow-update/${factoryId}`;

        try {
            await axios.get(reactFlowUpdate, {
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                withCredentials: true,
            });

        } catch (error) {
            console.log("Error updating React Flow in relation card component", error);
        }
    }

    const handleReset = () => {
        setInputValue([]);
        showToast("success", "success", "Relations reseted successfully")
    }

    const handleUpdateRelations = async (payload: Payload) => {
        const url = `${API_URL}/asset/update-relation`;
        try {
            const response = await axios.patch(url, payload, {
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                withCredentials: true,
            })

            if (response.data?.status === 204 && response.data?.success === true) {
                if (deleteRelation) {

                    showToast("success", "success", "Relation deleted successfully");
                } else {
                    showToast("success", "success", "Relations saved successfully");
                }

            }
        }catch (error) {
            if (axios.isAxiosError(error)) {
                console.error("Error response:", error.response?.data.message);
               showToast('error', 'Error', "Updating relations");
            } 
        }
    }

    const handleSave = () => {
        const obj:RelationData  = {};
        const allocatedAssetIds: string[] = [];
        inputValue.forEach(item => {
            Object.keys(item).forEach(key => {
                // Check if the key ends with '_asset', if so, ignore it
                if (key !== "" && !key.endsWith('_asset')) {

                    for (let relation of relations) {
                        if (relation === key) {
                            if (Array.isArray(item[key])) {
                                const newArr: string[] = [];
                               (item[key] as string[]).forEach(value => {
                                    newArr.push(value);
                                    obj[key] = newArr;
                                    allocatedAssetIds.push(value)
                                }
                                )
                            } else {
                                obj[key] = [item[key] as string];
                                // allocatedAssetIds.push(...[item[key]])
                                allocatedAssetIds.push(item[key] as string);
                            }
                        }
                    }

                }
            });
        });
        
        const payload: Payload = {
            [assetId]: Object.keys(obj).map(key => ({
                type: "Relationship",
                object: obj[key]
            }))
        };
       

        handleUpdateRelations(payload);
        updateReactFlow(factoryId);
        setDeleteRelation(false);
    }

    const handleDelete = () => {
        handleReset();
        const obj : RelationUpdate  = {};
        inputValue.forEach(item => {
            Object.keys(item).forEach(key => {
                if (key !== "" && !key.endsWith('_asset')) {
                 
                    obj[key] = []
                }
            })
        })
        
        const payload: Payload = {
        [assetId]: Object.keys(obj).map(key => ({
            type: "Relationship",
            object: obj[key] as string[]
        }))
    };
        handleUpdateRelations(payload);
        setDeleteRelation(true);
    }

    const handleKeyDown = (event: React.KeyboardEvent, relationData:RelationData) => {
        if (focus && event.key === 'Backspace')
            if (relationData && Object.keys(relationData).length > 0) {

                const relation = Object.keys(relationData)[0];
                const index = inputValue.findIndex(item => item.hasOwnProperty(relation));

                if (index !== -1) {
                    // Create a new array with the updated object
                    const updatedInputValue = inputValue.map((item, idx) => {
                        if (idx === index) {

                            return {
                                ...item,
                                [relation]: "", // Set to empty string or any other value as needed
                                [`${relation}_asset`]: "" // Set to empty string or any other value as needed
                            };
                        }
                        return item;
                    });
                 
                    setInputValue(updatedInputValue);
                }
            }
    }







    return (
        <>
            <div className="mt-4">
                <div className="flex align-items-center gap-2">
                    <p style={{ fontWeight: "bold" }}>Relations</p>
                    <img
                        onClick={() => setResetData(prev => !prev)}
                        style={{ cursor: "pointer" }}
                        src="/refresh.png" alt="reset-icon" width="20px" height="20px" />
                </div>

                <Card className="p-4">
                    <Toast ref={toast} />
                    {Array.isArray(relations) && relations.length > 0 && (
                        <form >
                            <div>
                                {
                                    relations.map((relation, index) => {

                                        const relatedObject = inputValue.find(obj => obj[`${relation}_asset`]);

                                        const value = relatedObject ? relatedObject[`${relation}_asset`] : "";
                                        const relationAssetId = relatedObject ? relatedObject[`${relation}`] : "";
                                        // allRelationAssetIds.push(relationAssetId); // commented out due to type error

                                        // Ensure relationAssetId is always an array
                                        const relationAssetIdArray = Array.isArray(relationAssetId) ? relationAssetId : [relationAssetId];
                                        allRelationAssetIds.push(...relationAssetIdArray);

                                        // const getAssetValues = () => {
                                        //     const entry = inputValue.find(entry => entry[relation]);
                                        //     if (entry && entry.hasOwnProperty(relation) && Array.isArray(entry[`${relation}`])) {
                                        //         allRelationAssetIds.push(...entry[`${relation}`]);
                                        //     }
                                        //     return entry ? entry[`${relation}_asset`] : [];
                                        // }
                                       const getAssetValues = (): string[] => {
                                            const entry = inputValue.find(entry => entry[relation]);
                                            if (entry && entry.hasOwnProperty(relation) && Array.isArray(entry[`${relation}`])) {
                                                allRelationAssetIds.push(...entry[`${relation}`]);
                                            }
                                            const value = entry ? entry[`${relation}_asset`] : [];
                                            return Array.isArray(value) ? value : [value];
                                        };

                                        return (
                                            <div key={index} className="flex mb-4">
                                                <label htmlFor="" style={{ flex: "0 20%", marginRight: "1.2rem" }}>{relation}</label>
                                                {(relation === "hasWorkpiece" || relation === "hasCatridge") ? (
                                                    <Chips
                                                        style={{ flex: "0 70%" }}
                                                        value={getAssetValues()}
                                                        onRemove={(e) => {
                                                            const [value] = e.value;

                                                        setInputValue(prevValue => {
                                                            return prevValue.map(item => {
                                                                if (Array.isArray(item[relation])) {
                                                                    const relationAssets = item[`${relation}_asset`];
                                                                    if (Array.isArray(relationAssets)) {
                                                                        const findIndexValue = relationAssets.findIndex(asset => asset === value);
                                                                        if (findIndexValue !== -1) {
                                                                            // Ensure `item[relation]` is an array before calling `splice` or it will give Type Error
                                                                            (item[relation] as string[]).splice(findIndexValue, 1);
                                                                        }
                                                                        // Remove `findIndexValue` index value in `item[relation]` array
                                                                        const newAssets = relationAssets.filter(asset => asset !== value);
                                                                        return { ...item, [`${relation}_asset`]: newAssets };
                                                                    }
                                                                }
                                                                return item;
                                                            });
                                                        });

                                                        }}
                                                    />
                                                ) : (
                                                    <>

                                                        <InputText
                                                            style={{ flex: "0 70%" }}
                                                            className="input-content"
                                                            placeholder=""
                                                            value={typeof value === 'string' ? value : Array.isArray(value) ? value.join(', ') : ''}
                                                            onFocus={() => setFocus(true)}
                                                            onKeyDown={(e) => handleKeyDown(e, relatedObject || {} )}
                                                        />
                                                    </>
                                                )}
                                            </div>
                                        )
                                    }
                                    )
                                }
                            </div>

                        </form>
                    )}
                    {relations.length > 0 &&
                        <div className="form-btns">
                            <Button
                                onClick={() => handleSave()}
                            >Save
                            </Button>
                            <Button
                                onClick={() => handleReset()}
                                severity="secondary" text raised
                                label={t('reset')}
                                className="mr-2 reset-btn"
                                type="button"
                            ></Button>
                            <Button
                                onClick={() => handleDelete()}
                                label={t('delete')}
                                severity="danger"
                                outlined
                                className="mr-2"
                                type="button"
                            />
                        </div>
                    }
                    {relations.length === 0 && <p>No relations exist</p>}
                </Card>
            </div>
        </>
    );
};

export default Relations;