import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { InputText } from "primereact/inputtext";
import { fetchAssetById } from "@/utility/factory-site-utility";
import { useFactoryShopFloor } from "@/context/factory-shopfloor-context";
import { Chips } from "primereact/chips";
import axios from "axios";

interface RelationObject {
    type: string;
    object: string | string[];
}
interface Payload {
    [key: string]: RelationObject | RelationObject[];
}
const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

const Relations = () => {
    const [relations, setRelations] = useState<string[]>([]);

    const {
        focused, setFocused,
        setGetRelation,
        inputValue,
        setInputValue,
        assetId,
    } = useFactoryShopFloor();


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


    console.log("assetid in relation", assetId);

    const handleReset = () => {
        setInputValue([])
    }

    console.log("inputValue in relations", inputValue);

    const getPayload = () => {

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



        console.log("payload here", payload);

    }


    const handleSave = async () => {
        const payload = getPayload();
        console.log("payload here", payload);

        const url = `${API_URL}/asset/${assetId}`;
        try {
            const response = await axios.patch(url, payload, {
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                withCredentials: true,
            })
            console.log("resposne of relations", response);


        } catch (error) {
            console.error(error)
        }
    }
    console.log(relations, "all relations here");



    return (
        <>
            <Card className="p-4">
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
