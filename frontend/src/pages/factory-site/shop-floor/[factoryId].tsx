import React, { useState, useEffect, useRef } from "react";
import { Button } from "primereact/button";
import { useRouter } from "next/router";
import FlowEditor from "../factories/flow-editor";
import ShopFloorList from "../../../components/ShopFloorList";
import AssetList from "../../../components/AssetList";
import { ShopFloor } from "../types/shop-floor";
import { Asset } from "../../../interfaces/assetTypes";

import {
  getshopFloorById,
  getNonShopFloorAsset,
  getShopFloors,
} from "@/utility/factory-site-utility";
import { any } from "prop-types";
import axios from "axios";
import { List } from "postcss/lib/list";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

const ShopFloorManager: React.FC = () => {
  const [factoryDetails, setFactoryDetails] = useState<ShopFloor | null>(null);
  const router = useRouter();


  const factoryId =
    typeof router.query.factoryId === "string"
      ? router.query.factoryId
      : router.query.factoryId
        ? router.query.factoryId[0]
        : "";

  console.log("id ", factoryId);
  useEffect(() => {
    if (factoryId) {
      (async () => {
        try {
          const details = await getshopFloorById(factoryId as any);
          setFactoryDetails(details as any);
        } catch (error) {
          console.error("Failed to fetch factory details", error);
        }
      })();
    }
  }, [factoryId]);

  console.log("G Floor setted  ", factoryDetails);
  const fileInputRef = useRef(null);
  const triggerFileInput = () => {
    // Trigger the hidden file input onClick of the button
    if (fileInputRef.current != null) {
      fileInputRef.current.click();
    }
  };

  async function createAssets(body: any) {
    try {
      const response = await axios.post(API_URL + "/asset", body, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        withCredentials: true,
      });
      console.log(response);
    } catch (error) {
      console.error("Error:", error);
    }
  }

  const handleFileChange = (event: { target: { files: any; }; }) => {
    const files = event.target.files;
    if (files.length > 0) {
      // Assuming createAssets is a function that takes the selected file
      for (let i = 0; i < files.length; i++) {
        const reader = new FileReader();

        reader.onload = function (e) {
          // e.target.result contains the file's content as a text string
          try {
            const json = JSON.parse(e.target.result); // Parse the JSON string into an object
            createAssets(JSON.stringify(json)); // Call createAssets with the parsed JSON data
          } catch (error) {
            console.error('Error parsing JSON:', error);
          }
        };

        reader.onerror = function(error) {
          console.error('Error reading file:', error);
        };

        reader.readAsText(files[i]); 
      };
    }
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <Button
            label="Create Floor"
            onClick={() => router.push("/create-floor")}
          />
        </div>

        <div>
          <Button
            label="Import Assets"
            onClick={triggerFileInput}
          />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }} // Hide the file input
          />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          height: "calc(100vh - 50px)",
          marginTop: "20px",
        }}
      >
        <div
          style={{ flex: 1, borderRight: "1px solid #ccc", padding: "10px" }}
        >
          <ShopFloorList factoryId={factoryId} />
        </div>
        <div
          style={{ flex: 2, borderRight: "1px solid #ccc", padding: "10px" }}
        >
          {factoryDetails && <FlowEditor factory={factoryDetails} />}
          {!factoryDetails && <div>Loading factory details...</div>}
        </div>
        <div style={{ flex: 1, padding: "10px" }}>
          <AssetList factoryId={factoryId} />
        </div>
      </div>
    </>
  );
};

export default ShopFloorManager;
