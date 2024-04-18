import { fetchAssetById } from "@/utility/factory-site-utility";
import { Card } from "primereact/card";
import { InputText } from "primereact/inputtext";
import React, { useEffect, useState } from "react";

interface RelationsProp {
    assetId: string
}

const Relations: React.FC<RelationsProp> = ({ assetId }) => {
    const [relations, setRelations] = useState([]);

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
    
    return (
        <>
            <Card className="p-4">
                <div >
                    {relations.length > 0 ?
                        relations.map((relation, index) => (
                            <div key={index} className="flex mb-4">
                                <label htmlFor=""
                                    style={{ flex: "0 20%" }}
                                >{relation}</label>
                                <InputText
                                    style={{ flex: "0 70%" }}
                                    className="input-content"
                                    placeholder=""
                                />
                            </div>
                        ))
                        : <p>No relations exists</p>
                    }
                </div>
            </Card>
        </>
    )
}

export default Relations;