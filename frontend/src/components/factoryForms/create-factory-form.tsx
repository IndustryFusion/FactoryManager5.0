import React, { useState, ChangeEvent, useEffect, useRef, useMemo } from "react";
import Select from "react-select";
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import countryList from 'react-select-country-list'
import "@/styles/factory-form.css"
import {
    faSave,
    faBuilding,
    faStreetView,
    faFileImage,
    faMapMarkedAlt,
    faBoxOpen,
} from "@fortawesome/free-solid-svg-icons";
import Thumbnail from "@/components/thumbnail";
import { useRouter } from "next/router";
import { Toast } from "primereact/toast"
import { Factory, FactoryFormProps } from "../../interfaces/factoryType";
import { handleUpload } from "@/utility/factory-site-utility";
import { Property, Schema } from "../../pages/factory-site/types/factory-form";
import { Dialog } from "primereact/dialog";
;

const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

interface CountryOption {
    value: string;
    label: string;
}

const CreateFactory: React.FC<FactoryFormProps> = ({ onSave, initialData, visibleProp, setVisibleProp }) => {

    const [factory, setFactory] = useState<Factory>(
        initialData || {
            factory_name: "",
            street: "",
            zip: null,
            country: "",
            thumbnail: "",
            hasShopFloor: "",
        }
    );
    const [uploading, setUploading] = useState<boolean>(false);
    const [uploadedFileName, setUploadedFileName] = useState<string>("");
    const [fileUploadKey, setFileUploadKey] = useState(0);
    const [schema, setSchema] = useState<Schema | null>(null);
    const router = useRouter();
    const toast = useRef<Toast | null>(null);
    const [selectedCountry, setSelectedCountry] = useState<CountryOption | null>(null);
    const [validateFactory, setValidateFactory] = useState(false);
    const [validateThumbnail, setValidateThumbnail]= useState(false);


    const options = useMemo(() => {
        return countryList().getData().map(country => ({
            value: country.value,
            label: country.label,
        }));
    }, []);


    const handleInputChange = (
        e: ChangeEvent<HTMLInputElement>,
        key: keyof Factory
    ) => {
        setFactory({ ...factory, [key]: e.target.value });
        setValidateFactory(false)
    };


    const changeHandler = (e: any, key: keyof Factory) => {
        // Find the corresponding label in the options array
        const selectedOption = options.find(option => option.value === e.value);

        if (selectedOption) {
            const label = selectedOption.label;
            console.log(typeof label, "country label");
            setFactory({ ...factory, [key]: label });
            setSelectedCountry(selectedOption)
        }
    };


    const handleFileUpload = async (e: { files: File[] }) => {
        const file = e.files[0];
        if (file) {
            setUploading(true);
            try {
                const uploadedUrl = await handleUpload(file);
                setFactory({ ...factory, thumbnail: uploadedUrl });
                setUploadedFileName(file.name);
                setUploading(false);
            } catch (error) {
                console.error("Error uploading file:", error);
                setUploading(false);
            }
        }
    };

    // const testdata = [
    //     "urn:ngsi-ld:factories:2:104",
    //     "urn:ngsi-ld:factories:2:103",
    // ];

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

    const handleSave = async () => {
        console.log(factory.thumbnail , "thumbnail value here");
        
        let payload;
        if(factory.factory_name === "" ){
            setValidateFactory(true)
        }else{
                payload = {
                    $schema: `${schema?.$schema}`,
                    $id: `${schema?.$id}`,
                    title: `${schema?.title}`,
                    description: `${schema?.description}`,
                    type: `${schema?.$id}`,
                    properties: {
                        factory_name: factory.factory_name,
                        street: factory.street,
                        zip: factory.zip,
                        country: factory.country,
                        thumbnail: factory.thumbnail,
                        hasShopFloor: "",
                    },
                };
        
        }

        console.log("Sending payload:", payload);

        try {
            const response = await axios.post(API_URL + "/factory-site/", payload, {
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                withCredentials: true,
            });
            console.log("Response from server:", response.data);
            const responseData = response.data;
            if (responseData.success && responseData.status === 201) {
                showSuccess();
            }else if(responseData.status === 400 ){
                showError();
            }
        } catch (error: any) {
            console.log(error , "what's the error");
            
            if (error.response.status === 404) {
              showError();
            }
          }
    };

    const showSuccess = () => {
        if (toast.current !== null) {
            toast.current.show({
                severity: 'success',
                summary: 'Success',
                detail: 'Factory created successfully',
                life: 2000
            });
        }
    };
    const showError = () => {
        if (toast.current !== null) {
            toast.current.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Please fill all required fields',
                life: 2000
            });
        }
    };


    const handleReset = (event: any) => {
        event.preventDefault();
        const resetFactoryForm = JSON.parse(JSON.stringify(factory));
        resetFactoryForm.thumbnail = factory.thumbnail;
        setFileUploadKey((prevKey) => prevKey + 1);

        Object.keys(schema?.properties || {}).forEach((key) => {
            const property = schema?.properties[key];
            console.log(property);
            if (
                property &&
                typeof property === "object" &&
                property.contentMediaType
            ) {
                resetFactoryForm[key] = "";
            } else {
                resetFactoryForm[key] = "";
            }

        })

        setFactory(resetFactoryForm);
        setUploadedFileName("");
    }


    const findFactoryTemplate = async () => {
        try {
            const response = await axios.get(API_URL + "/factory-site/template", {
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                withCredentials: true,
            });
            console.log(response, "template response");

            const responseData = response.data;
            setSchema(responseData);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        findFactoryTemplate();
    }, []);


    useEffect(() => {
        const fetchAllAlerts = async () => {
            try {
                const response = await axios.get(API_URL + "/alerts", {
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    withCredentials: true,
                });
                console.log("alerts response", response.data);


            } catch (error) {
                console.error(error)
            }
        }
        fetchAllAlerts();
    })


    const renderFields = (key: string, property: Property) => {
        const value = factory[key];

        return (
            <>
                {property.type === "number" && (
                    <div className="field mb-4">
                        <label htmlFor={key}>
                            <FontAwesomeIcon
                                icon={faMapMarkedAlt}
                                className="form-icons"
                            />
                            {property.title}
                        </label>
                        <InputNumber
                            id={key}
                            value={value}
                            placeholder={property?.description}
                            onChange={(e: any) => setFactory({ ...factory, zip: e.value })}
                        />
                    </div>
                )}

                {property.type === "string" && (
                    <div className="field mb-4">
                        <label htmlFor={key}>
                            {key === "factory_name" && (
                                <FontAwesomeIcon className="form-icons" icon={faBuilding} style={{ color: "grey" }} />
                            )}
                            {key === "street" && (
                                <FontAwesomeIcon
                                    className="form-icons"
                                    icon={faStreetView}
                                    style={{ color: "grey" }}
                                />
                            )}
                            {key === "country" && (
                                <FontAwesomeIcon className="form-icons" icon={faBoxOpen} style={{ color: "grey" }} />
                            )}
                            {property.title}
                        </label>
                        {key === "country" ? (
                            <Select
                                placeholder={property?.description}
                                options={options}
                                value={selectedCountry}
                                onChange={(e) => changeHandler(e, key)}
                            />
                        ) : (
                            <>
                            <InputText
                                id={key}
                                value={value}
                                type="text"
                                placeholder={property?.description}
                                onChange={(e) => handleInputChange(e, key)}
                            />
                           
                            </>
                        )}
                        {key === "factory_name" && validateFactory &&
                         <p className="input-invalid-text" >Factory Name is required</p>}
                    </div>
                )}
                {property.type === "object" && (
                    <div className="field mb-4 small-fileupload-button">
                        <label htmlFor={key}>
                            <FontAwesomeIcon
                                className="form-icons"
                                icon={faFileImage} style={{ color: "grey" }} />{" "}
                            {property.title}
                        </label>
                        <Thumbnail
                            keyProp={key}
                            fileUploadKeyProp={fileUploadKey}
                            handleFileUploadProp={handleFileUpload}
                            setUploadedFileNameProp={setUploadedFileName}
                            uploadingProp={uploading}
                            uploadedFileNameProp={uploadedFileName}
                        />
                    </div>
                )}
            </>
        );
    };

    const footerContent = (
        <div className="form-btn-container mb-2 flex justify-content-end align-items-center">
            <Button
                label="Cancel"
                severity="danger" outlined
                className="mr-2"
                type="button"
                onClick={() => setVisibleProp(false)}
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
    );


    return (
        <>
            <div className="card flex justify-content-center">
                <Button label="Show" icon="pi pi-external-link" onClick={() => setVisibleProp(true)} />
                <Dialog visible={visibleProp} modal footer={footerContent} 
                draggable={false} resizable={false}
                style={{ width: '50rem' }} onHide={() => setVisibleProp(false)}>
                    <Toast ref={toast} />
                    <div className="p-fluid p-formgrid p-grid ">
                        <h2 className="form-title">Create Factory</h2>
                        <Card className="factory-form-container mt-4 center-button-container ">
                            {schema &&
                                schema?.properties &&
                                Object.keys(schema.properties).map((key) =>
                                    renderFields(key, schema.properties[key])
                                )}
                        </Card>
                    </div>
                </Dialog>
            </div>
        </>
    )
}
export default CreateFactory;