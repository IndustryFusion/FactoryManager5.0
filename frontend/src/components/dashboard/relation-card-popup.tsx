import { useDashboard } from "@/context/dashboard-context";
import { Dialog } from "primereact/dialog";
import { Dispatch, SetStateAction } from "react";

interface RelationPopupProps {
    relationsProp: boolean;
    setRelationsProp: Dispatch<SetStateAction<boolean>>;
}


const RelationDialog: React.FC<RelationPopupProps> = ({ relationsProp, setRelationsProp }) => {

    const { selectedAssetData } = useDashboard();

    console.log(selectedAssetData, "what's the selected Asset here");

    const hasPropertiesArray = [];
    for (const key in selectedAssetData) {
        if (key.startsWith("has")) {
            const propertyName = key.substring(3); // Remove the "has" prefix
            const propertyValue = selectedAssetData[key];
            hasPropertiesArray.push({ [propertyName]: propertyValue });
        }
    }

    console.log("has property array", hasPropertiesArray);

    return (
        <>
            <Dialog header="Relations" visible={relationsProp} style={{ width: '50vw' }} onHide={() => setRelationsProp(false)}>
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
                                style={{listStyle:"circle"}}
                                >
                                    {value.map((item, index) =>
                                        <li
                                        className="ml-4"
                                        key={index}>{item.object === "json-ld-1.1" ? "data" : item.object}</li>
                                    )}
                                </ul>
                            }


                        </div>
                    )
                })}
            </Dialog>

        </>
    )
}

export default RelationDialog;