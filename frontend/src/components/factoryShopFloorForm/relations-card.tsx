import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { InputText } from "primereact/inputtext";
import { fetchAssetById } from "@/utility/factory-site-utility";
import { useFactoryShopFloor } from "@/context/factory-shopfloor-context";
import { Chips } from "primereact/chips";
import axios from "axios";
import { Toast, ToastMessage } from "primereact/toast";

import { useRouter } from "next/router";

interface RelationObject {
    type: string;
    object: string | string[];
}
interface Payload {
    [key: string]: RelationObject | RelationObject[];
}
const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

const Relations = () => {
    const router = useRouter();
    const [relations, setRelations] = useState<string[]>([]);
    const {
        focused, setFocused,
        setGetRelation,
        inputValue,
        setInputValue,
        assetId,
    } = useFactoryShopFloor();
    const toast = useRef<any>(null);


    useEffect(() => {
        const getRelations = async () => {
            try {
                const response = await fetchAssetById(assetId);
                if (response) {
                    console.log("response here", Object.keys(response));
                    const relationsValues = Object.keys(response);
                    setRelations(relationsValues);

                } else {
                    console.error("Response is undefined");
                }
            } catch (error) {
                console.error(error);
            }
        }

        getRelations();
    }, [assetId]);

    const showToast = (severity: ToastMessage['severity'], summary: string, message: string) => {
        toast.current?.show({ severity: severity, summary: summary, detail: message, life: 5000 });
    };


    const handleReset = () => {
        setInputValue([]);
        showToast("success", "success", "Relations reseted successfully")
    }

    const handleUpdateRelations =async(payload)=>{
        const url = `${API_URL}/asset/update-relation`;
        try {
            const response = await axios.patch(url, payload, {
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                withCredentials: true,
            })
            console.log("resposne of relations", response);
          
            if (response.data?.status === 204 && response.data?.success === true) {
                showToast("success", "success", "Relations saved successfully")              
              }
        } catch (error) {
            console.error(error)
        }
    }

    const handleSave = async ()=> {
        const obj = {};
        inputValue.forEach(item => {
            Object.keys(item).forEach(key => {
                // Check if the key ends with '_asset', if so, ignore it
                if (key !== "" && !key.endsWith('_asset')) {
                    console.log(key, "key here");

                    if (Array.isArray(item[key])) {
                        const newArr = [];
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
        handleUpdateRelations(payload)

        const factoryId = router.query.factoryId;  
        const reactFlowUpdate = `${API_URL}/react-flow/react-flow-update/${factoryId}`
        await axios.get(reactFlowUpdate, {
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                withCredentials: true,
            })
          

        
    }

    console.log(relations, "all relations here");


    const handleDelete =()=>{
     console.log("inputValue", inputValue)
     inputValue.forEach(item => {
        Object.keys(item).forEach(key => {
            if (key !== "" && !key.endsWith('_asset')){
                console.log(key, "key here")
            }
        })
    })
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

                                const getAssetValues = () => {
                                    const entry = inputValue.find(entry => entry[relation]);
                                    console.log(entry, "what's the entry here")
                                    return entry ? entry[`${relation}_asset`] : [];
                                }

                                return (
                                    <div key={index} className="flex mb-4">
                                        <label htmlFor="" style={{ flex: "0 20%", marginRight: "18px" }}>{relation}</label>
                                        {(relation === "hasWorkpiece" || relation === "hasCatridge") ? (
                                            <Chips
                                                value={getAssetValues()}
                                                onFocus={() => {
                                                    setGetRelation(relation);
                                                    setFocused(true);
                                                }}
                                                onBlur={() => setFocused(false)}
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
                                            <InputText
                                                style={{ flex: "0 70%" }}
                                                className="input-content"
                                                placeholder=""
                                                value={value}
                                                onFocus={() => {
                                                    setGetRelation(relation)
                                                    setFocused(true)
                                                }}
                                                onBlur={() => setFocused(false)}
                                            />
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
                            onClick={() => handleSave()}
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
                        onClick={()=>handleDelete()}
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
