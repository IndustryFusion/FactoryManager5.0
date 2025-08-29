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

import React, { useState, ChangeEvent, useEffect, useRef, useMemo } from "react";
import Select from "react-select";
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
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
import { Factory, FactoryFormProps } from "../../types/factory-type";
import { handleUpload } from "@/utility/factory-site-utility";
import { Property, Schema } from "../../types/factory-form";
import { Dialog } from "primereact/dialog";
import { useTranslation } from "next-i18next";
import { CountryOption } from "../../types/factory-form";
import { Dropdown } from "primereact/dropdown";
import { getAccessGroup } from '@/utility/indexed-db';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

const CreateFactory: React.FC<FactoryFormProps> = ({ onSave, initialData, visibleProp, setVisibleProp }) => {

    const [factory, setFactory] = useState<Factory>(
        initialData || {
            factory_name: "",
            street: "",
            zip: "",
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
    const [validateThumbnail, setValidateThumbnail] = useState(false);
    const [submitDisabled, setSubmitDisabled] = useState(false)
    const { t } = useTranslation('button');

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
    
    const onKeyDownHandler = (event: React.KeyboardEvent<HTMLInputElement>) => {
    //  Prevent entering non-numeric characters in an InputNumber field
    if (!/[0-9]/.test(event.key) && event.key !== "Backspace") {
        event.preventDefault();
     }
   };


    const changeHandler = (e: CountryOption, key: keyof Factory) => {
        // Find the corresponding label in the options array
        console.log("selected value here", e.value);
        
        const selectedOption = options.find(option => option.value === e.value);
        console.log("selectedOption", selectedOption);
        
        if (selectedOption) {
            const label = selectedOption.label;
           
            setFactory({ ...factory, [key]: label });
            setSelectedCountry(selectedOption)
        }
    };

    console.log("selectedCountry?.label outside", selectedCountry?.label);
    

    const handleFileUpload = async (e: { files: File[] }) => {
        const file = e.files[0];

        if (file) {
            setUploading(true);

            try {
                const uploadedUrl = await handleUpload(file);
                setFactory({ ...factory, thumbnail: uploadedUrl });
                setUploadedFileName(file.name);
                setUploading(false);
                setSubmitDisabled(false)
            } catch (error) {
                console.error("Error uploading file:", error);
                setUploading(false);
            }
        }
    };

 
    const handleSave = async () => {
        const zipCode = typeof factory.zip === 'number' ? factory.zip.toString() : (factory.zip || "");
        let payload;
        if (factory.factory_name === "") {
            setValidateFactory(true)


        } else {
            payload = {
                $schema: `${schema?.$schema}`,
                $id: `${schema?.$id}`,
                title: `${schema?.title}`,
                description: `${schema?.description}`,
                type: `${schema?.$id}`,
                properties: {
                    factory_name: factory.factory_name,
                    street: factory.street,
                    zip: zipCode,
                    country: factory.country,
                    thumbnail: factory.thumbnail,
                    hasShopFloor: "",
                    company_ifric_id: ""
                },
            };
        }



        try {
            const accessGroupData = await getAccessGroup();
            if(payload?.properties) {
                payload.properties.company_ifric_id = accessGroupData.company_ifric_id;
            }
            const response = await axios.post(API_URL + "/factory-site/", payload, {
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                withCredentials: true,
            });
      
            const responseData = response.data;
            console.log("on submit of factory", responseData);
            
            if (responseData.success && responseData.status === 201) {
                showSuccess();
                  setTimeout(() => {
                    setVisibleProp(false);
                }, 1000); 
            }
        } catch (error) {
            console.log( "handleSave function Error from @components/factoryForms/create-factory-form",error);
            if (axios.isAxiosError(error)) {
                showError("Please fill all required fields");
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
    const showError = (message:string) => {
        if (toast.current !== null) {
            toast.current.show({
                severity: 'error',
                summary: 'Error',
                detail: message,
                life: 2000
            });
        }
    };


    const handleReset = (event:React.FormEvent) => {
        event.preventDefault();
        const resetFactoryForm = JSON.parse(JSON.stringify(factory));
        resetFactoryForm.thumbnail = factory.thumbnail;
        setFileUploadKey((prevKey) => prevKey + 1);

        Object.keys(schema?.properties || {}).forEach((key) => {
            const property = schema?.properties[key];
           
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
       

            const responseData = response.data;
            setSchema(responseData);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                showError("getting factory template");
            }
        }
    };

    useEffect(() => {
        findFactoryTemplate();
    }, []);



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
                            className="placeholder-create-factory"
                            onChange={(e: Factory) => setFactory({ ...factory, zip: e.value })}                           
                            useGrouping={false}
                            onKeyDown={onKeyDownHandler}
                        />
                    </div>
                )}

                {property.type === "string" && (
                    <div className="field mb-4">
                        <label htmlFor={key} className="label-factory-create">
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
                             <div className="flex justify-content-between align-items-center country-dropdown">
                             <Dropdown
                               appendTo="self"
                               id="country"
                               name="country"
                               placeholder={property?.description}
                               options={options}
                               value={selectedCountry?.value}
                               onChange={(e) => changeHandler(e as CountryOption, key)}
                             />
                             <img
                               className="dropdown-icon-img"
                               src="/dropdown-icon.svg"
                               alt="dropdown-icon"
                             />
                           </div>
                        ) : (

                            <InputText
                                id={key}
                                value={value}
                                type="text"
                                placeholder={property?.description}
                                onChange={(e) => handleInputChange(e, key)}
                            />
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
                            setSubmitDisabledProp={setSubmitDisabled}
                        />
                    </div>
                )
             }
            </>
        )
    }

   const footerContent = (
  <div className="dialog-footer">
    <Button
      label={t('cancel')}
      severity="danger"
      outlined
      className="global-button is-white flex items-center gap-2"
      type="button"
      onClick={() => setVisibleProp(false)}
    >
      <img src="/reset.svg" alt="cancel" className="w-4 h-4" />
    </Button>

    <Button
      label={t('reset')}
      severity="secondary"
      text
      raised
      className="global-button is-red flex items-center gap-2"
      type="button"
      onClick={handleReset}
    >
      <img src="/cancel-circle-wht.svg" alt="reset" className="w-4 h-4" />
    </Button>

    <Button
      label={t('submit')}
      onClick={handleSave}
      className="global-button is-blue flex items-center gap-2"
      disabled={submitDisabled}
    >
      <img src="/checkmark-circle-02 (1).svg" alt="submit" className="w-4 h-4" />
    </Button>
  </div>
);

    const header=()=>{
        return(
            <h2 className="form-title">Create Factory</h2>
        )
    }

    return (
      <>
        <div className=" flex justify-content-center create-factory-form">
          <Button
            label={t("show")}
            icon="pi pi-external-link"
            onClick={() => setVisibleProp(true)}
          />
          <Dialog
            header={header}
            visible={visibleProp}
            modal
            footer={footerContent}
            draggable={false}
            resizable={false}
            style={{ width: "50rem" }}
            onHide={() => setVisibleProp(false)}
          >
            <Toast ref={toast} />
            <div className="p-fluid p-formgrid p-grid factory-form-container">
              {/* <Card className="factory-form-container mt-4 center-button-container "> */}
              {schema &&
                schema?.properties &&
                Object.keys(schema.properties).map((key) => (
                  <div key={key}>
                    {" "}
                    {renderFields(key, schema.properties[key])}
                  </div>
                ))}
            </div>
          </Dialog>
        </div>
      </>
    );
}
export default CreateFactory;