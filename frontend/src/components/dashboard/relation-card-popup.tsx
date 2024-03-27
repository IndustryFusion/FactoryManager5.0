import { useDashboard } from "@/context/dashboard-context";
import axios from "axios";
import { Dialog } from "primereact/dialog";
import { Dispatch, SetStateAction, useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

interface RelationPopupProps {
    relationsProp: boolean;
    setRelationsProp: Dispatch<SetStateAction<boolean>>;
}


const RelationDialog: React.FC<RelationPopupProps> = ({ relationsProp, setRelationsProp }) => {
    const [parentRelations, setParentRelations] = useState([]);
    const { selectedAssetData, entityIdValue } = useDashboard();

    console.log(selectedAssetData, "what's the selected Asset here in relation card");

    const hasPropertiesArray = [];
    for (const key in selectedAssetData) {
        if (key.startsWith("has")) {
            const propertyName = key.substring(3); // Remove the "has" prefix
            const propertyValue = selectedAssetData[key];
            hasPropertiesArray.push({ [propertyName]: propertyValue });
        }
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
            console.log("parent relation response", response);
            setParentRelations(response.data)
        } catch (error) {
            console.error(error)
        }
    }

    useEffect(() => {
        relationParent();
    }, [])

    console.log("has property array", hasPropertiesArray);

    return (
        <>
            <Dialog header="Relations" visible={relationsProp} style={{ width: '50vw' }} onHide={() => setRelationsProp(false)}>
                <div className="flex gap-3">
                    <div style={{ flex: "50%" }}>
                        <h4 className="m-0 mb-3">Child</h4>
                        {hasPropertiesArray.map((property, index) => {
                            const key = Object.keys(property)[0];
                            const value = property[key];
                            console.log(key, value, "all values here");

                            return (
                                <div key={index} className="mb-2 flex">
                                    <span>{key} - </span>
                                    <span className="ml-2">{value.object === "json-ld-1.1" ? "" : value.object}</span>

                                    {typeof value === "object" &&
                                        value.length > 0 &&
                                        <ul
                                            className="m-0 p-0"
                                            style={{ listStyle: "circle" }}
                                        >
                                            {value.map((item, index) =>
                                                <li
                                                    className="ml-4"
                                                    key={index}>{item.object === "json-ld-1.1" ? "" : item.object}</li>
                                            )}
                                        </ul>
                                    }
                                </div>
                            )
                        })}
                    </div>
                    <div style={{ flex: "50%" }}>
                        <h4 className="m-0 mb-3">Parent</h4>
                        {parentRelations.map((item, index) =>{
                          const {product_name, id,asset_category} = item;
                        return(
                            <>
                            <h4>{product_name?.value}</h4>
                            <ul>
                                <li>{id}</li>
                                <li>{asset_category?.value}</li>
                            </ul>
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