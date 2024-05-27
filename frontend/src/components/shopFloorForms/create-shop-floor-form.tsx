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

import axios from "axios";
import React, { useEffect, useState, ChangeEvent, useRef } from "react";
import { Property, Schema } from "../../types/factory-form";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { InputTextarea } from "primereact/inputtextarea";
import { Dropdown } from "primereact/dropdown";
import { ShopFloor } from "../../types/shop-floor-form";
import { handleUpload } from "@/utility/factory-site-utility";
import { Toast } from "primereact/toast";
import "../../styles/factory-form.css";
import Thumbnail from "@/components/thumbnail";
import { Dialog } from "primereact/dialog";
import { useShopFloor } from "@/context/shopfloor-context";
import { useTranslation } from "next-i18next";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;


interface shopFloor {
  id :string,
  name:string, 
  type:string
}
interface CreateShopFloorProps {
  isVisibleProp: boolean;
  setIsVisibleProp: React.Dispatch<React.SetStateAction<boolean>>;
  factoryId: string;
}

const CreateShopFloor: React.FC<CreateShopFloorProps> = ({
  isVisibleProp,
  setIsVisibleProp,
  factoryId,
}) => {
  const [shopFloorTemplate, setShopFloorTemplate] = useState<Schema | null>(
    null
  );
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [fileUploadKey, setFileUploadKey] = useState(0);
  const [submitDisabled, setSubmitDisabled] = useState(false);
  const [validateShopFloor, setValidateShopFloor] = useState(false);
  const [shopFloor, setShopFloor] = useState<ShopFloor>({
    floor_name: "",
    description: "",
    thumbnail: "",
    type_of_floor: [],
    hasAsset: "",
  });
  const toast = useRef<Toast | null>(null);
  const { addShopFloor } = useShopFloor();
  const { t } = useTranslation('button');
  useEffect(() => {
    findShopFloorTemplate();
  }, []);

  const findShopFloorTemplate = async () => {
    try {
      const response = await axios.get(API_URL + "/shop-floor/template", {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        withCredentials: true,
      });
      setShopFloorTemplate(response.data);
   
    } catch (error) {
       if (axios.isAxiosError(error)) {
        showError("Fetching shopfloor template");
      }
      console.error(" Fetching shopfloor template", error);
    }
  };

  const handleInputTextChange = (
    e: ChangeEvent<HTMLInputElement>,
    key: keyof ShopFloor
  ) => {
    setShopFloor({ ...shopFloor, [key]: e.target.value });
    setValidateShopFloor(false);
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


    if (file) {
      setUploading(true);
      try {
        const uploadedUrl = await handleUpload(file);
        setShopFloor({ ...shopFloor, thumbnail: uploadedUrl });
        setUploadedFileName(file.name);
        setUploading(false);
        setSubmitDisabled(false);
      } catch (error) {
        console.error("Error uploading file:", error);
        setUploading(false);
      }
    }
  };

  const handleReset = (event: React.FormEvent) => {
    event.preventDefault();
    const newFormShopFloor = JSON.parse(JSON.stringify(shopFloor));
    newFormShopFloor.thumbnail = shopFloor.thumbnail;
    setFileUploadKey((prevKey) => prevKey + 1);

    Object.keys(shopFloorTemplate?.properties || {}).forEach((key) => {
      const property = shopFloorTemplate?.properties[key];
   
      if (
        property &&
        typeof property === "object" &&
        property.contentMediaType
      ) {
        newFormShopFloor[key] = "";
      } else {
        newFormShopFloor[key] = "";
      }
    });

    setShopFloor(newFormShopFloor);
    setUploadedFileName("");
  };

  const handleSave = async () => {
    let payload;
    if (shopFloor.floor_name === "") {
      setValidateShopFloor(true);
    } else {
      payload = {
        $schema: `${shopFloorTemplate?.$schema}`,
        $id: `${shopFloorTemplate?.$id}`,
        title: `${shopFloorTemplate?.title}`,
        description: `${shopFloorTemplate?.description}`,
        type: `${shopFloorTemplate?.$id}`,
        properties: {
          floor_name: shopFloor.floor_name,
          description: shopFloor.description,
          type_of_floor: shopFloor.type_of_floor,
          thumbnail: shopFloor.thumbnail,
          hasAsset: shopFloor.hasAsset,
        },
      };
    }

    try {
      const response = await axios.post(API_URL + "/shop-floor", payload, {
        params: {
          "factory-id": factoryId,
        },
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        withCredentials: true,
      });

      const shopFloorResponse = response.data;
      

      if (shopFloorResponse.status === 201) {
        showSuccess();
        setIsVisibleProp(false);
        const newShopFloor: shopFloor = {
          id: response.data.id,
          name: response.data.floorName,
          type: "shopFloor",
        };
        addShopFloor(newShopFloor);
        // setIsVisibleProp(false);
      } else if (shopFloorResponse.status === 400) {
        showError("Please fill all required fields");
      }
    } catch (error) {
        if (axios.isAxiosError(error)) {
        showError("Error saving shop floor");
      }
      console.error("Error saving shop floor", error);
    }
  };

  const showSuccess = () => {
    if (toast.current !== null) {
      toast.current.show({
        severity: "success",
        summary: "Success",
        detail: "Shop Floor Added successfully",
        life: 2000,
      });
    }
  };
  const showError = (message: string) => {
    if (toast.current !== null) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: message,
        life: 3000,
      });
    }
  };

  const renderFields = (key: string, property: Property) => {
    const value = shopFloor[key];

    return (
      <>
        {property.type === "string" && (
          <div className="field mb-3">
            <label htmlFor={key}>{property.title}</label>
            {key === "description" ? (
              <InputTextarea
                value={value}
                onChange={(e) => handleInputTextAreaChange(e, key)}
                rows={4}
                cols={30}
                placeholder={property?.description}
              />
            ) : (
              <InputText
                id={key}
                value={value}
                type="text"
                placeholder={property?.description}
                onChange={(e) => handleInputTextChange(e, key)}
              />
            )}
            {key === "floor_name" && validateShopFloor && (
              <p className="input-invalid-text">ShopFloor Name is required</p>
            )}
          </div>
        )}
        {property.type === "object" && (
          <div className="field mb-3 small-fileupload-button">
            <label htmlFor={key}>{property.title}</label>
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
        )}
        {property.type === "array" && (
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
        )}
      </>
    );
  };

  const footerContent = (
    <div className="form-btn-container mb-2 flex justify-content-end align-items-center">
      <Button
        label={t('cancel')}
        severity="danger"
        outlined
        className="mr-2"
        type="button"
        onClick={() => setIsVisibleProp(false)}
      />
      <Button
        severity="secondary"
        text
        raised
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
  );

  return (
    <div className=" flex justify-content-center">
   
      <Dialog
        visible={isVisibleProp}
        modal
        footer={footerContent}
        style={{ width: "50rem" }}
        onHide={() => setIsVisibleProp(false)}
      >
        <Toast ref={toast} />
        <div className="p-fluid p-formgrid p-grid ">
          <h2 className="form-title">Shop Floor</h2>
          <Card className="factory-form-container mt-4 center-button-container ">
            {shopFloorTemplate &&
              shopFloorTemplate?.properties &&
              Object.keys(shopFloorTemplate.properties).map((key) =>
                <div key={key}>
                  {renderFields(key, shopFloorTemplate.properties[key])}
                </div>
              )}
          </Card>
        </div>
      </Dialog>
    </div>
  );
};

export default CreateShopFloor;
