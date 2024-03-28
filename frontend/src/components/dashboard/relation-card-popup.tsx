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
    const { selectedAssetData, entityIdValue,
        relationsCount, setRelationsCount
    } = useDashboard();
    const [countUpdated, setCountUpdated] = useState(false);
    const [hasPropertiesArray, setHasPropertiesArray] = useState([]);



    const getHasProperties = () => {
        const propertiesArray = [];
        for (const key in selectedAssetData) {
            if (key.startsWith("has")) {
                const propertyName = key.substring(3); // Remove the "has" prefix
                const propertyValue = selectedAssetData[key];
                propertiesArray.push({ [propertyName]: propertyValue });

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
            console.log("parent relation response", response);
            setParentRelations(response.data)
        } catch (error) {
            console.error(error)
        }
    }

    useEffect(() => {
        relationParent();
        getHasProperties();

        return setRelationsCount(0)
    }, [selectedAssetData])



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
                            if (value.object !== "json-ld-1.1" && !countUpdated) {
                                setRelationsCount((prev: any) => prev + 1);
                                setCountUpdated(true);
                            }
                            return (
                                <div key={index} className="mb-2 flex flex-column ">
                                    <h4 className="child-key-text m-0 mb-1">{key}  </h4>
                                    <p className="ml-2 child-key-value m-0">{value.object === "json-ld-1.1" ? "" : value.object}</p>
                                    {typeof value === "object" &&
                                        value.length > 0 &&
                                        <ul
                                            className="m-0 p-0"
                                            style={{ listStyle: "circle" }}
                                        >
                                            {value.map((item, index) => {
                                                if (item.object !== "json-ld-1.1" && !countUpdated) {
                                                    setRelationsCount((prev: any) => prev + 1);
                                                    setCountUpdated(true);
                                                }
                                                return (
                                                    <li
                                                        className="ml-4 child-key-value"
                                                        key={index}>{item.object === "json-ld-1.1" ? "" : item.object}</li>
                                                )
                                            }
                                            )}
                                        </ul>
                                    }
                                </div>
                            )
                        })}
                    </div>
                    <div style={{ flex: "50%" }}>
                        <h4 className="m-0 mb-3">Parent</h4>
                        {parentRelations.map((item, index) => {
                            const { product_name, id, asset_category } = item;
                            if (id !== "" && !countUpdated) {
                                console.log("is coming tocheckhere");

                                setRelationsCount((prev: any) => prev + 1);
                                setCountUpdated(true);
                            }
                            return (
                                <>
                                    <h4 className="parent-key-text m-0 mb-1">{product_name?.value}</h4>
                                    <ul className="mb-4 m-0">
                                        <li className="child-key-value">{id}</li>
                                        <li className="child-key-value">{asset_category?.value}</li>
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