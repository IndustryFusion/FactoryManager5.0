import React, { useCallback, useEffect, useState } from "react";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { InputText } from "primereact/inputtext";
import { fetchAssetById } from "@/utility/factory-site-utility";
import { useFactoryShopFloor } from "@/context/factory-shopfloor-context";
import { Chips } from "primereact/chips";

interface RelationsProp {
    assetId: string;
    additionalInputs?: any;
    handleAddInput?: any;
}

const Relations: React.FC<RelationsProp> = ({ assetId }) => {
    const [relations, setRelations] = useState([]);
    const { setFocused, inputValues, setGetRelation, workPieceRelations,setWorkPieceRelations } = useFactoryShopFloor();
    const [value, setValue] = useState([]);

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


    const handleSave = () => {

    }
    const handleReset =()=>{

    }

    // console.log("inputValues",inputValues );
    console.log("value in chip", value);
    

    const hasWorkPieceValues =()=>{

    }

    /**
     * hasCatridge
     * hasWorkpiece
     * 
     *    const [value, setValue] = useState([]);
     */
    

    console.log("workPieceRelations in relationscard",workPieceRelations );
    return (
        <>
            <Card className="p-4">
                <div>
                    {relations.length > 0 ? (
                        relations.map((relation, index) => (
                            <div key={index} className="flex mb-4">
                                <label htmlFor="" style={{ flex: "0 20%" }}>{relation}</label>
                                {(relation === "hasWorkpiece" ) ? (
                                    <>
                                      {/* <Chips value={value} onChange={(e) => setValue(e.value)} /> */}
                                        
                                        <Chips
                                            value={workPieceRelations || ""}
                                            onFocus={() => {
                                                setGetRelation(relation)
                                                setFocused(true)
                                            }}
                                            onBlur={() => setFocused(false)}
                                            onRemove={(e) => {
                                                const [value] = e.value;                                             
                                                const newRelations = workPieceRelations?.filter(relation => relation !== value);
                                                setWorkPieceRelations(newRelations);
                                             }}
                                       />
                                               
                                    </>
                                ) : (
                                    <InputText
                                        style={{ flex: "0 70%" }}
                                        className="input-content"
                                        placeholder=""
                                        value={inputValues[relation] || ""}
                                        //value={inputValue}
                                        onFocus={() => {
                                            setGetRelation(relation)
                                            setFocused(true)
                                        }}
                                        onBlur={() => setFocused(false)}
                                    />
                                )}
                                {/* {relation === "hasCatridge" && 
                                  <Chips
                                  value={workPieceRelations || ""}
                                  onFocus={() => {
                                      setGetRelation(relation)
                                      setFocused(true)
                                  }}
                                  onBlur={() => setFocused(false)}
                                  onRemove={(e) => {
                                      const [value] = e.value;                                             
                                      const newRelations = workPieceRelations?.filter(relation => relation !== value);
                                      setWorkPieceRelations(newRelations);
                                   }}
                             />
                                } */}
                            </div>
                        ))
                    ) : (
                        <p>No relations exists</p>
                    )}
                    {/* <div>
                        {Object.keys(additionalInputs).length > 0 && Object.keys(additionalInputs).map((relation, i) => (
                            Array.from({ length: additionalInputs[relation] }).map((_, j) => (
                                <MemoizedInputText relation={relation} index={j} />
                            ))
                        ))}
                    </div> */}

                </div>
                {relations.length > 0 &&
                    <div className="form-btns">
                        <Button
                            onClick={() => handleSave()}
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
