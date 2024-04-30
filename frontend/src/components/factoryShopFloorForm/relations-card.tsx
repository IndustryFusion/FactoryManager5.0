import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { InputText } from "primereact/inputtext";
import { fetchAssetById, fetchAssetDetailById } from "@/utility/factory-site-utility";
import { useFactoryShopFloor } from "@/context/factory-shopfloor-context";
import { Chips } from "primereact/chips";
import axios from "axios";
import { Toast, ToastMessage } from "primereact/toast";
import { useRouter } from "next/router";
import { fetchFormAllocatedAsset } from "@/utility/asset-utility";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/state/store";
import { create, reset } from '@/state/relations/relationsSlice';
interface RelationObject {
    type: string;
    object: string | string[];
}
interface Payload {
    [key: string]: RelationObject | RelationObject[];
}
const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

const Relations = () => {
    const {
        inputValue,
        setInputValue,
        assetId,
        setRelations,
        selectItems
    } = useFactoryShopFloor();

    const [factoryId, setFactoryId] = useState("");
    const [deleteRelation, setDeleteRelation] = useState(false);
    const toast = useRef<any>(null);
    const router = useRouter();
    const allRelationAssetIds: string[] = [];
    const dispatch = useDispatch();
    const relations = useSelector((state: RootState) => state.relations.values);
    const reduxAssetId = useSelector((state: RootState) => state.relations.id);
    console.log("relations at first ", relations);
    console.log("redux asset at first ", reduxAssetId);

   console.log();
   


    const getRelations = async () => {
        try {
            const response = await fetchAssetById(assetId);
            console.log("all response in relations", response);
            //res

            if (Object.keys(response).length > 0) {
                console.log("response here", Object.keys(response));
                const relationsValues = Object.keys(response);
                console.log('reduxAssetId ',reduxAssetId);
                console.log('assetId ',assetId);
                if(relations.length == 0 || assetId !== reduxAssetId){
                    dispatch(reset());
                    dispatch(create({
                        id: assetId,
                        values: relationsValues
                    }));
                }
                
                const allRelationsData = Object.fromEntries(Object.entries(response).map(([key, { objects }]) => [key, objects])
                );
                console.log(allRelationsData, "what's here as empty");
                //
                //{hasFilter:[""],
                //{hasTracker:[]}
                //


                for (const [key, values] of Object.entries(allRelationsData)) {
                    for (const value of values) {
                        if (value === 'json-ld-1.1') {
                          
                        } else {
                            console.log("relations else", relations);
                            const response = await fetchAssetDetailById(value);
                            console.log(`Response for ${key}:`, response);
                            const { product_name, id, asset_category } = response ?? {};
                            
                                selectItems(product_name, asset_category, id)
                        
                           
                            //setInputValue([]);
                        }

                    }
                }

                

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
    }, [assetId, relations]);



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
    // console.log(relations, "all relations here");
console.log(inputValue, "here inputValue in relation");


    const getAllocatedPayload = () => {
        let allocatedObj;
        if (deleteRelation) {
            allocatedObj = {
                [factoryId]: []
            }
        } else {
            allocatedObj = {
                [factoryId]: allRelationAssetIds
            }
        }
        console.log("allocatedObj", allocatedObj);
        return allocatedObj;
    }
    const handleReset = () => {
        setInputValue([]);
        showToast("success", "success", "Relations reseted successfully")
    }
    const handleUpdateRelations = async (payload:Payload) => {
        const url = `${API_URL}/asset/update-relation`;
        try {
            const response = await axios.patch(url, payload, {
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                withCredentials: true,
            })
            console.log("resposne of update relations", response);

            if (response.data?.status === 204 && response.data?.success === true) {
                showToast("success", "success", "Relations saved successfully")
            }
        } catch (error) {
            console.error(error)
        }
    }
    const handleSave = () => {
        const obj = {};
        console.log(inputValue,"here inputValue state")
        inputValue.forEach(item => {
            Object.keys(item).forEach(key => {
                // Check if the key ends with '_asset', if so, ignore it
                if (key !== "" && !key.endsWith('_asset')) {
                    console.log(key, "key here");

                    if (Array.isArray(item[key])) {
                        const newArr: string[] = [];
                        item[key].forEach(value => {
                            newArr.push(value);
                            obj[key] = newArr;
                        }
                        )
                    } else {
                        obj[key] = [item[key]]
                    }
                }
            });
        });
        console.log(obj, "obj here");
        const payload = {
            [assetId]: obj
        };
        console.log("payload for update relation", payload)
      handleUpdateRelations(payload)
    }
    const handleDelete = () => {
        handleReset();
        const obj = {};

        inputValue.forEach(item => {
            Object.keys(item).forEach(key => {
                if (key !== "" && !key.endsWith('_asset')) {
                    console.log(key, "key here")
                    obj[key] = []
                }
            })
        })
        const payload = {
            [assetId]: obj
        };
        console.log(obj, "obj here");    
        console.log(" here payload in delete", payload);

        handleUpdateRelations(payload);
        handleAllocatedAssets();
    }
    //factoryId and all assets urn  send
    const handleAllocatedAssets = async () => {
        const payloadObj = getAllocatedPayload();
        try {
            const response = await fetchFormAllocatedAsset(payloadObj);
            if (response?.data?.status === 201 && response?.data?.success === true) {
                showToast("success", "success", "saved to allocated assets successfully")
            }


        } catch (error) {
            console.error(error);
        }
    }


    return (
        <>
            <Card className="p-4">
                <Toast ref={toast} />
                <form >
                    <div>
                        {Array.isArray(relations) && relations.length > 0 && (
                            relations.map((relation, index) => {

                                const relatedObject = inputValue.find(obj => obj[`${relation}_asset`]);
                                const value = relatedObject ? relatedObject[`${relation}_asset`] : "";
                                const relationAssetId = relatedObject ? relatedObject[`${relation}`] : "";
                                allRelationAssetIds.push(relationAssetId);


                                const getAssetValues = () => {
                                    const entry = inputValue.find(entry => entry[relation]);
                                    console.log(entry, "what's the entry here")
                                    if (entry && entry.hasOwnProperty(relation) && Array.isArray(entry[`${relation}`])) {
                                        console.log(entry[`${relation}`], "wht's here in entry asstes");
                                        allRelationAssetIds.push(...entry[`${relation}`]);
                                    }
                                    return entry ? entry[`${relation}_asset`] : [];
                                }


                                return (
                                    <div key={index} className="flex mb-4">
                                        <label htmlFor="" style={{ flex: "0 20%", marginRight: "1.2rem" }}>{relation}</label>
                                        {(relation === "hasWorkpiece" || relation === "hasCatridge") ? (
                                            <Chips
                                                style={{ flex: "0 70%" }}
                                                value={getAssetValues()}
                                                onRemove={(e) => {
                                                    const [value] = e.value;
                                                    console.log(value, "on remove value here")
                                                    setInputValue(prevValue => {
                                                        return prevValue.map(item => {
                                                            if (item[relation]) {
                                                                console.log(item[relation], "what's here")
                                                                const newAssets = item[`${relation}_asset`].filter(asset => asset !== value);
                                                                return { ...item, [`${relation}_asset`]: newAssets };
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
                                                    value={value}
                                                />
                                            </>
                                        )}
                                    </div>
                                )
                            }
                            )
                        )}
                    </div>
                </form>
                {relations.length > 0 &&
                    <div className="form-btns">
                        <Button
                            onClick={() => {
                                setDeleteRelation(false);
                                handleSave();
                                handleAllocatedAssets();
                            }}
                        >Save
                        </Button>
                        <Button
                            onClick={() => handleReset()}
                            severity="secondary" text raised
                            label="Reset"
                            className="mr-2"
                            type="button"
                        ></Button>
                        <Button
                            onClick={() => {
                                setDeleteRelation(true);
                                handleDelete();
                            }
                            }
                            label="Delete"
                            severity="danger"
                            outlined
                            className="mr-2"
                            type="button"
                        />
                    </div>
                }
                {relations.length === 0 && <p>No relations exist</p>}
            </Card>
        </>
    );
};

export default Relations;
