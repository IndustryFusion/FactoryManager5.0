import React, { useCallback, useEffect, useState } from "react";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { InputText } from "primereact/inputtext";
import { fetchAssetById } from "@/utility/factory-site-utility";
import { useFactoryShopFloor } from "@/context/factory-shopfloor-context";
import { Chips } from "primereact/chips";
import axios from "axios";

interface RelationsProp {
    assetId: string;
    additionalInputs?: any;
    handleAddInput?: any;
}
const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

const Relations: React.FC<RelationsProp> = ({ assetId }) => {
    const [relations, setRelations] = useState<string[]>([]);
    const { setFocused, inputValues, setGetRelation,
        workPieceRelations, setWorkPieceRelations,
        catridgeRelations, setCatridgeRelations } = useFactoryShopFloor();

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

    // const payload = {
    //     for(let relation of relations) {
    //         let finalKey = 'http://www.industry-fusion.org/schema#' + relation;
    //     }

    // }

    console.log("catridgeRelations",catridgeRelations);
    

    const handleSave = async () => {
        const url = `${API_URL}/asset/${assetId}`;
        try {
            const response = await axios.patch(url, payload, {
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                withCredentials: true,
            })

        } catch (error) {
            console.error(error)
        }
    }
    const handleReset = () => {

    }


    return (
        <>
            <Card className="p-4">
                <div>
                    {Array.isArray(relations) && relations.length > 0 ? (
                        relations.map((relation, index) => (
                            <div key={index} className="flex mb-4">
                                <label htmlFor="" style={{ flex: "0 20%",marginRight:"18px" }}>{relation}</label>
                                {(relation === "hasWorkpiece" || relation === "hasCatridge") ? (
                                    <Chips
                                        value={relation === "hasWorkpiece" ? workPieceRelations || "" : catridgeRelations || ""}
                                        onFocus={() => {
                                            setGetRelation(relation)
                                            setFocused(true)
                                        }}
                                        onBlur={() => setFocused(false)}
                                        onRemove={(e) => {
                                            const [value] = e.value;
                                            const newRelations = relation === "hasWorkpiece" ? workPieceRelations?.filter(relation => relation !== value) : catridgeRelations?.filter(relation => relation !== value);
                                            if (relation === "hasWorkpiece") {
                                                setWorkPieceRelations(newRelations);
                                            } else {
                                                setCatridgeRelations(newRelations);
                                            }
                                        }}
                                    />
                                ) : (
                                    <InputText
                                        style={{ flex: "0 70%" }}
                                        className="input-content"
                                        placeholder=""
                                        value={inputValues[relation] || ""}
                                        onFocus={() => {
                                            setGetRelation(relation)
                                            setFocused(true)
                                        }}
                                        onBlur={() => setFocused(false)}
                                    />
                                )}
                            </div>
                        ))
                    ) : (
                        <p>No relations exist</p>
                    )}
                </div>

                {relations.length > 0 &&
                    <div className="form-btns">
                        <Button
                            // onClick={() => handleSave()}
                        >Save
                        </Button>
                        <Button
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


            </Card>
        </>
    );
};

export default Relations;
