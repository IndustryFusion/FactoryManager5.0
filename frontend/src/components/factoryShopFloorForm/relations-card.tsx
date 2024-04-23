import React, { useCallback, useEffect, useState } from "react";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { InputText } from "primereact/inputtext";
import { fetchAssetById } from "@/utility/factory-site-utility";
import { useFactoryShopFloor } from "@/context/factory-shopfloor-context";

interface RelationsProp {
    assetId: string;
    additionalInputs?: any;
    handleAddInput?: any;
}

const Relations: React.FC<RelationsProp> = ({ assetId }) => {
    // const relationsArray = ["hasFilter", "hasTracker", "hasCatridge", "workPiece"];
    const [additionalInputs, setAdditionalInputs] = useState<{ [key: string]: number }>({});
    const [relations, setRelations] = useState([]);
    const {inputValue, setFocused, inputValues} = useFactoryShopFloor();



    const handleAddInput = useCallback((relation: string) => {
        setAdditionalInputs(prev => ({
            ...prev,
            [relation]: (prev[relation] || 0) + 1,
        }));
    }, []);


    const getRelations = async () => {
        try {
            const response = await fetchAssetById(assetId);
            console.log("response here", Object?.keys(response));
            const relationsValues = Object?.keys(response);
            setRelations(relationsValues);
        } catch (error) {
            console.error(error)
        }
    }

    useEffect(() => {
        getRelations();
    }, [assetId]);

    const MemoizedInputText = React.memo(({ relation, index }) => (
        <InputText
            key={`${relation}-${index}`}
            style={{ flex: "0 70%" }}
            className="input-content"
            placeholder={relation}
        />
    ));

    console.log("inputValues", inputValues);


    return (
        <>
            <Card className="p-4">
                <div>
                    {relations.length > 0 ? (
                        relations.map((relation, index) => (
                            <div key={index} className="flex mb-4">
                                <label htmlFor="" style={{ flex: "0 20%" }}>{relation}</label>
                                {(relation === "hasCatridge" || relation === "hasWorkpiece") ? (
                                    <>
                                        <div style={{ flex: "0 70%" }}>
                                            <div className="flex justify-content-between">
                                                <div style={{ flex: "0 100%" }} >
                                                    <InputText
                                                        className="input-content"
                                                        placeholder=""
                                                    />
                                                </div>
                                                <div><Button onClick={() => handleAddInput(relation)}>add</Button></div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <InputText
                                        style={{ flex: "0 70%" }}
                                        className="input-content"
                                        placeholder=""
                                        value={inputValues[relation] || ""}
                                        //value={inputValue}
                                        onFocus={() => setFocused(true)}
                                        onBlur={() => setFocused(false)}
                                    />
                                )}
                            </div>
                        ))
                    ) : (
                        <p>No relations exists</p>
                    )}
                    <div>
                        {Object.keys(additionalInputs).length > 0 && Object.keys(additionalInputs).map((relation, i) => (
                            Array.from({ length: additionalInputs[relation] }).map((_, j) => (
                                <MemoizedInputText relation={relation} index={j} />
                            ))
                        ))}
                    </div>

                </div>
                {relations.length > 0 &&
                    <div className="form-btns">
                        <Button
                        //className="save-btn"
                        >Save</Button>
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
