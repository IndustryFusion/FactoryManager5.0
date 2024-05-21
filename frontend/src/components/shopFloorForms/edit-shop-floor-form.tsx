// 
// Copyright (c) 2024 IB Systems GmbH 
// 
// Licensed under the Apache License, Version 2.0 (the "License"); 
// you may not use this file except in compliance with the License. 
// You may obtain a copy of the License at 
// 
//    http://www.apache.org/licenses/LICENSE-2.0 
// 
// Unless required by applicable law or agreed to in writing, software 
// distributed under the License is distributed on an "AS IS" BASIS, 
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. 
// See the License for the specific language governing permissions and 
// limitations under the License. 
// 

import axios from "axios"
import { useEffect, useState, ChangeEvent, useRef } from "react";
import { Property, Schema } from "../../types/factory-form";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { InputTextarea } from "primereact/inputtextarea";
import { Dropdown } from "primereact/dropdown";
import { ShopFloor } from "../../types/shop-floor-form";
import { handleUpload } from "@/utility/factory-site-utility";
import { Toast, ToastMessage } from "primereact/toast";
import "../../styles/factory-form.css"
import Thumbnail from "@/components/thumbnail";
import { useRouter } from "next/router";
import { Dialog } from "primereact/dialog";
import { useTranslation } from "next-i18next";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

interface ShopFloorEditProps {
    editShopFloorProp: string | undefined;
    isEditProp: boolean,
    setIsEditProp: React.Dispatch<React.SetStateAction<boolean>>;
}


const EditShopFloor: React.FC<ShopFloorEditProps> = ({
    isEditProp,
    setIsEditProp,
    editShopFloorProp
}) => {

    const [shopFloorTemplate, setShopFloorTemplate] = useState<Schema | null>(null);
    const [uploading, setUploading] = useState<boolean>(false);
    const [uploadedFileName, setUploadedFileName] = useState<string>("");
    const [fileUploadKey, setFileUploadKey] = useState(0);
    const [shopFloor, setShopFloor] = useState<Record<string, any>>({});
    const [updateShopFloor, setUpdateShopFloor] = useState<Record<string, any>>({});
    const toast = useRef<Toast | null>(null);
    const [isEdit, setIsEdit] = useState(true);
    const [submitDisabled, setSubmitDisabled] = useState(false);
    const [validateShopFloor, setValidateShopFloor] = useState(false);
    const { t } = useTranslation('button');

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
        }catch (error: any) {
            if (axios.isAxiosError(error)) {
                showToast('error', 'Error', "Fetching shopfloor template");
            } else {
                console.error("Error:", error);
                showToast('error', 'Error', error);
            }
        }
      }

    const getShopFloorData = async () => {
        try {
            const response = await axios.get(API_URL + `/shop-floor/${editShopFloorProp}`, {
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                withCredentials: true,
            });
            if (Object.keys(response.data).length > 0) {
                const shopFloorData = response.data;
                const flattenedData = Object.keys(shopFloorData).reduce((acc, key) => {
                    if (key.includes("http://www.industry-fusion.org/schema#")) {
                        const newKey = key.replace(
                            "http://www.industry-fusion.org/schema#",
                            ""
                        );
                        if (newKey.includes("has")) {
                            acc[newKey] = shopFloorData[key].object;
                        } else {
                            acc[newKey] = shopFloorData[key].value;
                        }
                    } else {
                        acc[key] = shopFloorData[key];
                    }
                    return acc;
                }, {} as ShopFloor);
                setShopFloor(flattenedData);
            }
        }catch (error: any) {
            if (axios.isAxiosError(error)) {
                showToast('error', 'Error', "Fetching shopfloor data");
            } else {
                console.error("Error:", error);
                showToast('error', 'Error', error);
            }
        } 
    }

    useEffect(() => {
        findShopFloorTemplate();
        getShopFloorData();
    }, [editShopFloorProp])


    const handleInputTextChange = (
        e: ChangeEvent<HTMLInputElement>,
        key: keyof ShopFloor
    ) => {
        setUpdateShopFloor({ ...updateShopFloor, [key]: e.target.value });
        setValidateShopFloor(false);
    };

    const handleInputTextAreaChange = (
        e: ChangeEvent<HTMLTextAreaElement>,
        key: keyof ShopFloor
    ) => {
        setUpdateShopFloor({ ...updateShopFloor, [key]: e.target.value });

    };

    const handleDropdownChange = (e: { value: string }, key: keyof ShopFloor) => {
        setUpdateShopFloor({ ...updateShopFloor, [key]: e.value });
    };

    const handleFileUpload = async (e: { files: File[] }) => {
        const file = e.files[0];
        setIsEdit(false);
        if (file) {
            setUploading(true);
            try {
                const uploadedUrl = await handleUpload(file);
                setUpdateShopFloor({ ...updateShopFloor, thumbnail: uploadedUrl });
                setUploadedFileName(file.name);
                setUploading(false);
                setSubmitDisabled(false);
            } catch (error) {
                showToast("error", "Error","Error uploading file");
                console.error("Error uploading file:", error);
                setUploading(false);
            }
        }
    };

    const handleReset = (event: any) => {
        event.preventDefault();
        setUpdateShopFloor({});
        setIsEdit(true);
        setValidateShopFloor(false);
        showToast("success", "Success", "Reset successfully")
    }

    const handleSave = async () => {
        if (updateShopFloor.floor_name === "") {
            setValidateShopFloor(true);
            showToast("error", "Error","Please fill all required fields");
        } else {
            try {          
                const finalData = Object.keys(updateShopFloor).reduce((acc, key) => {
                    acc[`http://www.industry-fusion.org/schema#${key}`] = {
                        type: "Property",
                        value: updateShopFloor[key],
                    };
                    return acc;
                }, {} as ShopFloor);

           

                const response = await axios.patch(API_URL + `/shop-floor/${editShopFloorProp}`, finalData, {
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    withCredentials: true,
                })

                const shopFloorResponse = response.data;
                if (shopFloorResponse.status === 200 || shopFloorResponse.status == 204) {
                    showToast("success", "Success", "ShopFloor Updated successfully")
                } else {
                    showToast("error", "Error","Error Updating ShopFloor");
                }
            } catch (error: any) {
                if (axios.isAxiosError(error)) {
                    showToast('error', 'Error', "saving shopfloor");
                } else {
                    console.error("Error:", error);
                    showToast('error', 'Error', error);
                }
            }
        }

    }

    const showToast = (severity: ToastMessage['severity'], summary: string, message: string) => {
        toast.current?.show({ severity: severity, summary: summary, detail: message, life: 3000 });
    };

    const renderFields = (key: string, property: Property) => {
        let value = shopFloor[key];

        if (updateShopFloor.hasOwnProperty(key)) {
            value = updateShopFloor[key];
        }

        return (
            <>
                {property.type === "string" &&
                    <div className="field mb-3">
                        <label htmlFor={key}>{property.title}</label>
                        {key === "description" ?
                            <InputTextarea
                                value={value || ""}
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
                        {key === "floor_name" && validateShopFloor &&
                            <p className="input-invalid-text" >ShopFloor Name is required</p>
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
                                isEditProp={isEdit}
                                fileProp={value}
                                setIsEditProp={setIsEdit}
                                setSubmitDisabledProp={setSubmitDisabled}
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

    const footerContent = (
        <div className="form-btn-container mb-2 flex justify-content-end align-items-center">
            <Button
                label={t('cancel')}
                severity="danger" outlined
                className="mr-2"
                type="button"
                onClick={() => setIsEditProp(false)}
            />
            <Button
                severity="secondary" text raised
                label={t('reset')}
                className="mr-2 reset-btn"
                type="button"
                onClick={handleReset}
            />
            <Button
                label={t('submit')}
                onClick={handleSave}
                className="border-none  ml-2 mr-2"
                disabled={submitDisabled}
            />
        </div>
    )


    return (
        <>
            <div className=" flex justify-content-center">
                <Dialog visible={isEditProp} modal footer={footerContent} style={{ width: '50rem' }} onHide={() => setIsEditProp(false)}>
                    <Toast ref={toast} />
                    <div className="p-fluid p-formgrid p-grid ">
                        <h2 className="form-title mb-3">Edit Shop Floor</h2>
                        <Card className="factory-form-container  center-button-container py-3">
                            <div className="align-center">
                                <p className=" mb-3 mt-0"
                                    style={{
                                        fontStyle:'italic',
                                        color: "#a8a8ff",
                                        fontSize: "15px"
                                    }}
                                >
                                    {shopFloor?.id} </p>
                            </div>
                            {
                                shopFloorTemplate &&
                                shopFloorTemplate?.properties &&
                                Object.keys(shopFloorTemplate.properties).map((key) =>
                                    renderFields(key, shopFloorTemplate.properties[key])
                                )
                            }
                        </Card>
                    </div>
                </Dialog>
            </div>
        </>
    )
}

export default EditShopFloor;