import React, { useState, ChangeEvent, useEffect } from "react";
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { Dropdown } from "primereact/dropdown";
import { FileUpload } from "primereact/fileupload";
import { ProgressBar } from "primereact/progressbar";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import "../../../styles/factory-form.css";
import {
  faSave,
  faBuilding,
  faStreetView,
  faFileImage,
  faMapMarkedAlt,
  faBoxOpen,
} from "@fortawesome/free-solid-svg-icons";
import { Factory, FactoryFormProps } from "../../../interfaces/factoryType";
import { handleUpload } from "@/utility/factory-site-utility";
import { countriesData } from "@/data/countriesList";
import { Property, Schema } from "../types/factory-form";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

const FactoryForm: React.FC<FactoryFormProps> = ({ onSave, initialData }) => {
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
  const [schema, setSchema] = useState<Schema | null>(null);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement>,
    key: keyof Factory
  ) => {
    setFactory({ ...factory, [key]: e.target.value });
  };

  const handleDropdownChange = (e: { value: string }, key: keyof Factory) => {
    setFactory({ ...factory, [key]: e.value });
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
  const testdata = [
    "urn:ngsi-ld:factories:2:104",
    "urn:ngsi-ld:factories:2:103",
  ];
  
  const handleSave = async () => {
    const payload = {
      $schema: `${schema?.$schema}`,
      $id: `${schema?.$id}`,
      title: `${schema?.title}`,
      description: `${schema?.description}`,
      type: `${schema?.type}`,
      properties: {
        factory_name: factory.factory_name,
        street: factory.street,
        zip: factory.zip,
        country: factory.country,
        thumbnail: factory.thumbnail,
        hasShopFloor: "",
      },
    };

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
      if (typeof onSave == "function") {
        onSave(factory);
      } else {
        console.error("onSave is not a function");
      }
      console.log(response.data);
      onSave(factory);
    } catch (error) {
      console.error("Error saving factory data", error);
    }
  };

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

  const renderFields = (key: string, property: Property) => {
    const value = factory[key];

    return (
      <>
        {property.type === "number" && (
          <div className="field mb-3">
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
          <div className="field mb-3">
            <label htmlFor={key}>
              {key === "factory_name" && (
                <FontAwesomeIcon  className="form-icons" icon={faBuilding} style={{ color: "grey" }} />
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
              <Dropdown
                id="country"
                value={factory.country}
                options={countriesData}
                onChange={(e) => handleDropdownChange(e, key)}
                placeholder={property?.description}
                filter
                showClear
              />
            ) : (
              <InputText
                id={key}
                value={value}
                type="text"
                placeholder={property?.description}
                onChange={(e) => handleInputChange(e, key)}
              />
            )}
          </div>
        )}
        {property.type === "object" && (
          <div className="field mb-3 small-fileupload-button">
            <label htmlFor={key}>
              <FontAwesomeIcon
              className="form-icons"
              icon={faFileImage} style={{ color: "grey" }} />{" "}
              {property.title}
            </label>
            <FileUpload
              id="file"
              name="file"
              mode="advanced"
              url="/file"
              customUpload
              accept="image/*"
              uploadHandler={handleFileUpload}
              className="small-fileupload-button"
            />
            {uploading && (
              <ProgressBar mode="indeterminate" style={{ marginTop: "2rem" }} />
            )}
            {!uploading && uploadedFileName && (
              <p className="p-2">Uploaded File: {uploadedFileName}</p>
            )}
          </div>
        )}
            
      </>
    );
  };

  return (
    <>
    <div className="p-fluid p-formgrid p-grid ">
      <Card className="factory-form-container mt-7 center-button-container ">
        {schema &&
          schema?.properties &&
          Object.keys(schema.properties).map((key) =>
            renderFields(key, schema.properties[key])
          )}
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
                    // onClick={handleReset}
                />
                <Button
                    label="Submit"
                    onClick={handleSave}
                    className="border-none  ml-2 mr-2"
                />
    </div> 
    </>
  );
};

export default FactoryForm;
