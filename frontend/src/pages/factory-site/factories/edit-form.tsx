import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { Dropdown } from "primereact/dropdown";
import { FileUpload } from "primereact/fileupload";
import { countriesData } from "../../../data/countriesList";
import { Factory } from "@/interfaces/factoryType";
import { handleUpload, updateFactory } from "@/utility/factory-site-utility";
import { Button } from "primereact/button";
import { transformDataForBackend } from "@/utility/factory-site-utility";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Card } from "primereact/card";
import { ProgressBar } from "primereact/progressbar";
import "../../../styles/factory-edit.css";
import {
  faSave,
  faBuilding,
  faStreetView,
  faFileImage,
  faMapMarkedAlt,
  faBoxOpen,
} from "@fortawesome/free-solid-svg-icons";
import { useRouter } from "next/router";
import { Property, Schema } from "../types/factory-form";
const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;
interface FactoryEditProps {
  factory: any;
  onSave: (editedData: any) => void;
}

const FactoryEdit: React.FC<FactoryEditProps> = ({ factory, onSave }) => {

  const [editedFactory, setEditedFactory] = useState<Factory | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [schema, setSchema] = useState<Schema | null>(null);
  const router = useRouter();


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
    } catch (error) {
      console.error(error)
    }
  }

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
          console.log(factoryData, "what's the edit data");

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



  const renderFields = (key: string, property: Property) => {
    return (
      <>

        {property.type === "number" && (
          <div className="field mb-3">
            <label htmlFor={key}>
              <FontAwesomeIcon icon={faMapMarkedAlt} style={{ color: "grey" }} />{" "}
              {property.title}
            </label>
            <InputNumber
              id={key}
              value={editedFactory?.[key]}
              placeholder={property?.description}
              onChange={(e) => handleChange("zip", e.value)}
            />
          </div>
        )}
        {property.type === "string" && (
          <div className="field mb-3">
            <label htmlFor={key}>
              {key === "factory_name" &&
                <FontAwesomeIcon icon={faBuilding} style={{ color: "grey" }} />
              }
              {key === "street" &&
                <FontAwesomeIcon icon={faStreetView} style={{ color: "grey" }} />
              }
              {key === "country" &&
                <FontAwesomeIcon icon={faBoxOpen} style={{ color: "grey" }} />
              }
              {property.title}
            </label>
            {key === "country" ?
              <Dropdown
                id="country"
                value={editedFactory?.[key]}
                options={countriesData}
                onChange={(e) => handleChange(key, e.value)}
                placeholder={property?.description}
                filter
                showClear
              /> :
              <InputText
                id={key}
                value={editedFactory?.[key]}
                type="text"
                placeholder={property?.description}
                onChange={(e) => handleChange(key, e.target.value)}
              />
            }
          </div>
        )}
        {property.type === "object" &&
          <div className="p-field p-col-12 small-fileupload-button">
            <label htmlFor={key}>
              {" "}
              <FontAwesomeIcon
                icon={faFileImage}
                style={{ color: "grey" }}
              />
              {property.title}
            </label>
            <FileUpload
              id="thumbnail"
              name="thumbnail"
              customUpload
              uploadHandler={onFileUpload}
              accept="image/*"
              maxFileSize={1000000}
              chooseLabel={editedFactory?.[key]}
              className="small-fileupload-button"
            />
            {uploading && (
              <ProgressBar mode="indeterminate" style={{ marginTop: "2rem" }} />
            )}
            {!uploading && uploadedFileName && (
              <p>Uploaded File: {uploadedFileName}</p>
            )}
          </div>
        }
        {editedFactory?.[key] === "http://www.industry-fusion.org/schema#hasShopFloor" &&
          <div className="field mb-3">
            <label >hasShopFloor</label>
            <ul className="p-0 shop-floors">
              {Array.isArray(editedFactory?.[key].object)
                && editedFactory?.[key].object.length > 0
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

  // Handle input change events to update state
  const handleChange = (key: string, value: any) => {
    setEditedFactory((prev: any) => ({ ...prev, [key]: value }));
  };

  // Handle file upload for the thumbnail field
  const onFileUpload = async (e: { files: File[] }) => {
    const file = e.files[0];
    try {
      setUploading(true);
      const uploadedFileUrl = await handleUpload(file);
      setEditedFactory((prev: any) => ({
        ...prev,
        thumbnail: uploadedFileUrl,
      }));
      setUploadedFileName(file.name);
      setUploading(false);
    } catch (error) {
      console.error("File upload failed", error);
      setUploading(false);
    }
  };

  // Submit the edited factory data
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (editedFactory) {
      const dataToUpdate = {
        ...editedFactory,
      };

      const transformedData: any = transformDataForBackend(dataToUpdate);
      console.log(transformedData, "what's the transformeddata");


      try {
        const response = await updateFactory(transformedData, factory);
        if (response.success) {
          router.back();
        }
      } catch (error) {
        console.error("Error updating factory:", error);
      }
    }
  };

  return (
    <>
    <div className="p-fluid p-formgrid p-grid">
      <Card className="edit-form mt-7">
        <form onSubmit={handleSubmit}>
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
          </form>
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
              label="Save"
              type="submit"
              className="border-none  ml-2 mr-2"
            />
          </div>
          </>  
    
  );
};

export default FactoryEdit;
