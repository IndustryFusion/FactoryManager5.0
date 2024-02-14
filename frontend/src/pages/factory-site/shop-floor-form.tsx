import axios from "axios"
import { useEffect, useState, ChangeEvent, useRef } from "react";
import { Property, Schema } from "./types/factory-form";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { InputTextarea } from "primereact/inputtextarea";
import { Dropdown } from "primereact/dropdown";
import { ShopFloor } from "./types/shop-floor-form";
import { handleUpload } from "@/utility/factory-site-utility";
import { Toast } from "primereact/toast";
import "../../styles/factory-form.css"
import Thumbnail from "@/components/thumbnail";


const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

const ShopFloorForm = () => {
    const [shopFloorTemplate, setShopFloorTemplate] = useState<Schema | null>(null);
    const [uploading, setUploading] = useState<boolean>(false);
    const [uploadedFileName, setUploadedFileName] = useState<string>("");
    const [fileUploadKey, setFileUploadKey] = useState(0);
    const [shopFloor, setShopFloor] = useState<ShopFloor>(
        {
            floor_name: "",
            description: "",
            thumbnail: "",
            type_of_floor: [],
            hasAsset: ""
        }
    );
    const toast = useRef<Toast | null>(null);


    useEffect(() => {
        findShopFloorTemplate()
    }, [])

    const findShopFloorTemplate = async () => {
        try {
            const response = await axios.get(API_URL + '/shop-floor/template', {
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                withCredentials: true,
            })
            setShopFloorTemplate(response.data)
            console.log("shop floor template:", response.data);
        } catch (error) {
            console.error("Error fetching shopfloor template", error)
        }
    }

    const handleInputTextChange = (
        e: ChangeEvent<HTMLInputElement>,
        key: keyof ShopFloor
    ) => {
        setShopFloor({ ...shopFloor, [key]: e.target.value });
    };
    const handleInputTextAreaChange = (
        e: ChangeEvent<HTMLTextAreaElement>,
        key: keyof ShopFloor
    ) => {
        setShopFloor({ ...shopFloor, [key]: e.target.value });
    };
    const handleDropdownChange = (e: { value: string }, key: keyof ShopFloor) => {
        setShopFloor({ ...shopFloor, [key]: e.value });
    };
    const handleFileUpload = async (e: { files: File[] }) => {
        const file = e.files[0];
        console.log("file name", file);

        if (file) {
            setUploading(true);
            try {
                const uploadedUrl = await handleUpload(file);
                setShopFloor({ ...shopFloor, thumbnail: uploadedUrl });
                setUploadedFileName(file.name);
                setUploading(false);
            } catch (error) {
                console.error("Error uploading file:", error);
                setUploading(false);
            }
        }
    };

    const handleReset = (event: any) => {
        event.preventDefault();
        const newFormShopFloor = JSON.parse(JSON.stringify(shopFloor));
        newFormShopFloor.thumbnail = shopFloor.thumbnail;
        setFileUploadKey((prevKey) => prevKey + 1);

        Object.keys(shopFloorTemplate?.properties || {}).forEach((key) => {
            const property = shopFloorTemplate?.properties[key];
            console.log(property);
            if (
                property &&
                typeof property === "object" &&
                property.contentMediaType
            ) {
                newFormShopFloor[key] = "";
            } else {
                newFormShopFloor[key] = "";
            }

        })

        setShopFloor(newFormShopFloor);
        setUploadedFileName("");
    }

    const handleSave = async () => {
        const payload = {
            $schema: `${shopFloorTemplate?.$schema}`,
            $id: `${shopFloorTemplate?.$id}`,
            title: `${shopFloorTemplate?.title}`,
            description: `${shopFloorTemplate?.description}`,
            type: `${shopFloorTemplate?.type}`,
            properties: {
                floor_name: shopFloor.floor_name,
                description: shopFloor.description,
                type_of_floor: shopFloor.type_of_floor,
                thumbnail: shopFloor.thumbnail,
                hasAsset: shopFloor.hasAsset
            }
        }

        console.log("what's the payload", payload);
        const factoryId = "urn:ngsi-ld:factories:2:113"

        try {
            const response = await axios.post(API_URL + '/shop-floor', payload, {
                params: {
                    "factory-id": factoryId
                },
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                withCredentials: true,
            }
            )

            const shopFloorResponse = response.data;
            if (shopFloorResponse.status === 201) {
                showSuccess();
            } else {
                showError();
            }

        } catch (error) {
            console.error("Error saving shop floor", error)
        }

    }

    const showSuccess = () => {
        if (toast.current !== null) {
            toast.current.show({
                severity: 'success',
                summary: 'Success',
                detail: 'Shop Floor Added successfully',
                life: 2000
            });
        }
    };
    const showError = () => {
        if (toast.current !== null) {
            toast.current.show({
                severity: 'error', summary: 'Error',
                detail: 'Error Creating Shop Floor', life: 3000
            });
        }
    }

    const renderFields = (key: string, property: Property) => {
        const value = shopFloor[key];

        return (
            <>
                {property.type === "string" &&
                    <div className="field mb-3">
                        <label htmlFor={key}>{property.title}</label>
                        {key === "description" ?
                            <InputTextarea
                                value={value}
                                onChange={(e) => handleInputTextAreaChange(e, key)}
                                rows={4}
                                cols={30}
                                placeholder={property?.description}

                            />
                            :
                            <InputText
                                id={key}
                                value={value}
                                type="text"
                                placeholder={property?.description}
                                onChange={(e) => handleInputTextChange(e, key)}
                            />
                        }

                    </div>
                }
                {property.type === "object" &&
                    (
                        <div className="field mb-3 small-fileupload-button">
                            <label htmlFor={key}>{property.title}</label>
                            <Thumbnail
                                keyProp={key}
                                fileUploadKeyProp={fileUploadKey}
                                handleFileUploadProp={handleFileUpload}
                                setUploadedFileNameProp={setUploadedFileName}
                                uploadingProp={uploading}
                                uploadedFileNameProp={uploadedFileName}
                            />
                        </div>
                    )
                }
                {property.type === "array" &&
                    (
                        <div className="field mb-3 small-fileupload-button">
                            <label htmlFor={key}>{property.title}</label>
                            <Dropdown
                                placeholder={property?.description}
                                id={key}
                                value={value}
                                options={property.enum}
                                onChange={(e) => handleDropdownChange(e, key)}
                                className="p-inputtext-lg mt-2"

                            />
                        </div>
                    )
                }
            </>
        )
    }

    return (
        <div style={{ marginBottom: "6rem" }}>
            <Toast ref={toast} />
            <div className="p-fluid p-formgrid p-grid ">
                <Card className="factory-form-container mt-4 center-button-container p-0">
                    <h2>Shop Floor</h2>
                    {
                        shopFloorTemplate &&
                        shopFloorTemplate?.properties &&
                        Object.keys(shopFloorTemplate.properties).map((key) =>
                            renderFields(key, shopFloorTemplate.properties[key])
                        )
                    }
                </Card>

            </div>
            <div className="form-btn-container mb-2 flex justify-content-end align-items-center">
                <Button
                    label="Cancel"
                    severity="danger" outlined
                    className="mr-2"
                    type="button"
                //   onClick={handleCancel}
                />
                <Button
                    severity="secondary" text raised
                    label="Reset"
                    className="mr-2"
                    type="button"
                    onClick={handleReset}
                />
                <Button
                    label="Submit"
                    onClick={handleSave}
                    className="border-none  ml-2 mr-2"
                />
            </div>
        </div>
    )
}

export default ShopFloorForm;