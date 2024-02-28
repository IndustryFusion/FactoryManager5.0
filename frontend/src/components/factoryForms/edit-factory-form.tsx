import React, { useState, useEffect, ChangeEvent, FormEvent, useRef, useMemo } from "react";
import { useRouter } from "next/router";
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { Factory } from "@/interfaces/factoryType";
import { handleUpload, updateFactory } from "@/utility/factory-site-utility";
import { Button } from "primereact/button";
import { transformDataForBackend } from "@/utility/factory-site-utility";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Card } from "primereact/card";
import "../../styles/factory-form.css";
import Select from "react-select";
import {
    faBuilding,
    faStreetView,
    faFileImage,
    faMapMarkedAlt,
    faBoxOpen,
} from "@fortawesome/free-solid-svg-icons";
import { Property, Schema } from "../../pages/factory-site/types/factory-form";
import Thumbnail from "@/components/thumbnail";
import { Toast } from "primereact/toast";
import { Dialog } from "primereact/dialog";
import countryList from 'react-select-country-list'

const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

interface FactoryEditProps {
    factory: string | undefined;
    isEditProp: boolean,
    setIsEditProp: React.Dispatch<React.SetStateAction<boolean>>;
}
interface CountryOption {
    label: string;
    value: string;

}

const EditFactory: React.FC<FactoryEditProps> = ({ factory, isEditProp, setIsEditProp }) => {
    const [editedFactory, setEditedFactory] = useState<Factory | null>(null);
    const [resetFactory, setResetFactory] = useState<Factory | null>(null);
    const [uploading, setUploading] = useState<boolean>(false);
    const [uploadedFileName, setUploadedFileName] = useState<string>("");
    const [fileUploadKey, setFileUploadKey] = useState(0);
    const [schema, setSchema] = useState<Schema | null>(null);
    const [isEdit, setIsEdit] = useState(true);
    const router = useRouter();
    const [updateData, setUpdateData] = useState<Record<string, any>>({});
    const toast = useRef<Toast | null>(null);
    const [selectedCountry, setSelectedCountry] = useState<any>({});
    const [ validateFactory, setValidateFactory] = useState(false);
    const [submitDisabled, setSubmitDisabled] = useState(false);
    const [validateShopFloor, setValidateShopFloor] = useState(false);



    const findFactoryTemplate = async () => {
        try {
            const response = await axios.get(API_URL + '/factory-site/template', {
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                withCredentials: true,
            })
            const responseData = response.data;
            setSchema(responseData);
        } catch (error:any) {
            if (error.response.status === 404) {
                showError("getting factory template");
              }
        }
    }


    const options = useMemo(() => {
        return countryList().getData().map(country => ({
            value: country.value,
            label: country.label,
        }));
    }, []);

    useEffect(() => {
        const fetchFactoryDetails = async (factory: any) => {
            try {
                const response = await axios.get(`${API_URL}/factory-site/${factory}`, {
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    withCredentials: true,
                });

                if (response) {
                    // Transforming the backend data to match the Factory type
                    const factoryData = response.data;


                    const transformedFactoryData = {
                        factory_name:
                            factoryData["http://www.industry-fusion.org/schema#factory_name"]
                                ?.value,
                        street:
                            factoryData["http://www.industry-fusion.org/schema#street"]
                                ?.value,
                        zip: factoryData["http://www.industry-fusion.org/schema#zip"]
                            ?.value,
                        country:
                            factoryData["http://www.industry-fusion.org/schema#country"]
                                ?.value,
                        thumbnail:
                            factoryData["http://www.industry-fusion.org/schema#thumbnail"]
                                ?.value,
                    };

                    setEditedFactory(transformedFactoryData);
                    setResetFactory(transformedFactoryData);

                    // if(editedFactory?.country){
                    //     const editFactory = options.find(option => option.label === editedFactory?.country);
                    //     console.log(editFactory, " wt's the value");

                    //    setSelectedCountry(editFactory)
                    //     }

                    console.log(editedFactory, "fatc data");
                } else {
                    console.log("No factory data returned from the API");
                }
            } catch (error) {
                console.error("Error fetching factory details:", error);
            }
        };

        if (factory) {
            fetchFactoryDetails(factory);
        }
    }, [factory]);

    useEffect(() => {
        findFactoryTemplate();
    }, [])

    useEffect(() => {
        if (editedFactory?.country) {
            const editFactory = options.find(option => option.label === editedFactory?.country);
            console.log(editFactory, " wt's the value");

            // Set the selected country using the label property of editFactory
            setSelectedCountry(editFactory);
        }
    }, [editedFactory, options]); // dependencies array



    const renderFields = (key: string, property: Property) => {
        return (
            <>

                {property.type === "number" && (
                    <div className="field mb-4">
                        <label htmlFor={key}>
                            <FontAwesomeIcon icon={faMapMarkedAlt} style={{ color: "grey" }} className="form-icons" />{" "}
                            {property.title}
                        </label>
                        <InputNumber
                            id={key}
                            value={editedFactory?.[key]}
                            placeholder={property?.description}
                            onChange={(e) => handleChange("zip", e.value)}
                            useGrouping={false}
                        />
                    </div>
                )}
                {property.type === "string" && (
                    <div className="field mb-4">
                        <label htmlFor={key}>
                            {key === "factory_name" &&
                                <FontAwesomeIcon icon={faBuilding} className="form-icons" style={{ color: "grey" }} />
                            }
                            {key === "street" &&
                                <FontAwesomeIcon icon={faStreetView} className="form-icons" style={{ color: "grey" }} />
                            }
                            {key === "country" &&
                                <FontAwesomeIcon icon={faBoxOpen} className="form-icons" style={{ color: "grey" }} />
                            }
                            {property.title}
                        </label>
                        {key === "country" ?
                            <Select
                                id="country"
                                value={selectedCountry}
                                options={options}
                                onChange={(e) => changeHandler(e, key)}
                                placeholder={property?.description}

                            /> :
                            <InputText
                                id={key}
                                value={editedFactory?.[key]}
                                type="text"
                                placeholder={property?.description}
                                onChange={(e) => handleChange(key, e.target.value)
                                }
                            />
                        }
                            {key === "factory_name" && validateFactory &&
                         <p className="input-invalid-text" >Factory Name is required</p>}
                    </div>
                )}
                {property.type === "object" &&
                    <div className="field mb-4">
                        <label htmlFor={key}>
                            {" "}
                            <FontAwesomeIcon
                                icon={faFileImage}
                                style={{ color: "grey" }}
                                className="form-icons"
                            />
                            {property.title}
                        </label>
                        <Thumbnail
                            keyProp={key}
                            fileUploadKeyProp={fileUploadKey}
                            handleFileUploadProp={onFileUpload}
                            setUploadedFileNameProp={setUploadedFileName}
                            uploadingProp={uploading}
                            uploadedFileNameProp={uploadedFileName}
                            isEditProp={isEdit}
                            fileProp={editedFactory?.[key]}
                            setIsEditProp={setIsEdit}
                            setSubmitDisabledProp={setSubmitDisabled}
                        />
                    </div>
                }
                {editedFactory?.[key] === "http://www.industry-fusion.org/schema#hasShopFloor" &&
                    <div className="field mb-4">
                        <label >hasShopFloor</label>
                        <ul className="p-0 shop-floors">
                            {Array.isArray(editedFactory?.[key].object)
                                && editedFactory?.[key].object.length > 0
                                && editedFactory?.[key].object.includes('urn')
                                && editedFactory?.[key].object.map((shop: any, index: any) =>
                                    <div key={index}>
                                        <li>{shop}</li>
                                    </div>
                                )}
                        </ul>
                    </div>
                }

            </>
        )
    }

    const changeHandler = (e: any, key: string) => {
        const selectedOption = options.find(option => option.value === e.value);

        if (selectedOption) {
            const label = selectedOption.label;
            console.log(typeof label, "country label");
            setEditedFactory((prev: any) => ({ ...prev, [key]: label }))
            setUpdateData((prev: any) => ({ ...prev, [key]: label }))
            setSelectedCountry(selectedOption)
        }
    };


    // Handle input change events to update state
    const handleChange = (key: string, value: any) => {
        console.log(value, "wt's the value");
        if(key === "factory_name"){
            setValidateFactory(false)
        }

        setEditedFactory((prev: any) => ({ ...prev, [key]: value }));
        setUpdateData((prev: any) => ({ ...prev, [key]: value }));
    };

    // Handle file upload for the thumbnail field
    const onFileUpload = async (e: { files: File[] }) => {
        const file = e.files[0];
        setIsEdit(false);
        try {
            setUploading(true);
            const uploadedFileUrl = await handleUpload(file);
            setEditedFactory((prev: any) => ({
                ...prev,
                thumbnail: uploadedFileUrl,
            }));
            setUpdateData((prev: any) => ({
                ...prev,
                thumbnail: uploadedFileUrl,
            }));

            setUploadedFileName(file.name);
            setUploading(false);
            setSubmitDisabled(false)
        } catch (error) {
            console.error("File upload failed", error);
            setUploading(false);
        }
    };
    // Submit the edited factory data
    const handleSubmit = async (event: any) => {
        event.preventDefault();

        console.log(updateData, "what's in this");
        console.log(  Object.keys(updateData).length === 0 );
        
        if(updateData.factory_name === "" ){
            setValidateFactory(true)
        
       }

        if (Object.values(updateData).every(value => value === '')) {
            showError("Please fill all required fields");
            return;  // Stop further execution
        }

       
            const dataToUpdate = {
                ...updateData,
            };

            const transformedData: any = transformDataForBackend(dataToUpdate);
            console.log(transformedData, "what's the transformeddata");
            try {
                const response = await updateFactory(transformedData, factory!);
                console.log(response, "factory response");

                if (response.success) {
                    showSuccess();
                } 
                
                else {
                    if(response.message.detail === "Index 0 out of bounds for length 0"){
                        showWaring("Browse and Upload the image");
                    } else {
                        showWaring(response.message.detail);
                    } 
                }
                    
            } catch (error) {
                showError(error);
                console.error("Error updating factory:", error);
            }
        
    };

    const showSuccess = () => {
        if (toast.current !== null) {
            toast.current.show({
                severity: 'success',
                summary: 'Success',
                detail: 'Factory edited successfully',
                life: 2000
            });
        }
    };
    const showError = (message:any) => {
        if (toast.current !== null) {
            toast.current.show({
                severity: 'error',
                summary: 'Error',
                detail: message,
                life: 2000
            });
        }
    };

    const showWaring = (message:any) => {
        if (toast.current !== null) {
            toast.current.show({
                severity: 'warn',
                summary: 'Warning',
                detail: message,
                life: 2000
            });
        }
    };

    const handleReset = () => {
        setEditedFactory(resetFactory);
        setValidateFactory(false);
        setIsEdit(true)
    }

    const footerContent = (
        <div className="form-btn-container mb-2 flex justify-content-end align-items-center">
            <Button
                label="Cancel"
                severity="danger" outlined
                className="mr-2"
                type="button"
                onClick={() => setIsEditProp(false)}
            />
            <Button
                severity="secondary" text raised
                label="Reset"
                className="mr-2"
                type="button"
                onClick={handleReset}
            />
            <Button
                label="Save"
                onClick={handleSubmit}
                className="border-none  ml-2 mr-2"
                disabled={submitDisabled}
            />
        </div>
    )

    return (
        <>
            <div className="card flex justify-content-center">
                <Button label="Show" icon="pi pi-external-link" onClick={() => setIsEditProp(true)} />
                <Dialog visible={isEditProp} modal footer={footerContent}
                    draggable={false} resizable={false}
                    style={{ width: '50rem' }} onHide={() => setIsEditProp(false)}>
                    <Toast ref={toast} />
                    <div className="p-fluid p-formgrid p-grid">
                        <h2 className="form-title">Edit Factory</h2>
                        <Card className="edit-form ">
                            {
                                schema &&
                                schema?.properties &&
                                Object.keys(schema.properties).map((key) =>
                                    renderFields(key, schema.properties[key])
                                )
                            }
                            {!editedFactory?.hasOwnProperty('hasShopFloor') && (
                                <div className="field mb-3">
                                    <label>No Shop Floors</label>
                                </div>
                            )}

                        </Card>
                    </div>
                </Dialog>
            </div>


        </>
    )
}
export default EditFactory;