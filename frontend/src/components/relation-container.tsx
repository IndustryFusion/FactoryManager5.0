import React, { useState, FormEvent, useEffect } from "react";
import { fetchAsset } from "@/utility/fleet-manager-utility";
// import AddRelationAsset from "@/pages/ics/[templateId]/[relationId]";
import { Card } from "primereact/card";
import "primereact/resources/themes/bootstrap4-light-blue/theme.css";
import "../styles/relation-container.css";
import { Checkbox } from "primereact/checkbox";
import { Button } from "primereact/button";
import "primereact/resources/primereact.min.css";
import "primeflex/primeflex.css";
import axios from "axios";
import SelectedAssetsList from "./selected-asset-relation";
type Asset = string;
type ContainerProps = {
  onAssetSelect: (asset: Asset) => void;
};

const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;
const Container: React.FC<ContainerProps> = ({ onAssetSelect }) => {
  const [selectedAssets, setSelectedAssets] = useState<Asset[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [productName, setProductName] = useState<string>("");
  const [selectedAssetForEdit, setSelectedAssetForEdit] = useState<
    string | null
  >(null);
  const [selectedAssetFormData, setSelectedAssetFormData] = useState<
    Record<string, any>
  >({});

  const handleNewAsset = () => {};
  //
  const handleSelectAsset = async (asset: Asset) => {
    if (selectedAssets.includes(asset)) {
      setSelectedAssets((prevSelectedAssets) =>
        prevSelectedAssets.filter((a) => a !== asset)
      );
    } else {
      setSelectedAssets((prevSelectedAssets) => [...prevSelectedAssets, asset]);
    }

    if (selectedAssetForEdit === asset) {
      setSelectedAssetForEdit(null);
      setSelectedAssetFormData({});
    } else {
      setSelectedAssetForEdit(asset);

      try {
        const response = await axios.get(`${API_URL}/asset/${asset}`, {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          withCredentials: true,
        });

        setSelectedAssetFormData(response.data);
      } catch (error) {
        console.error("Error fetching asset data for editing:", error);
      }
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    // Implement form submission logic here
  };

  useEffect(() => {
    // Fetch assets when the component mounts
    fetchAsset()
      .then((data: any) => {
        console.log("Fetched Data:", data);
        setAssets(data || []);

        const productNameFromData =
          data?.["http://www.industry-fusion.org/schema#product_name"]?.value ||
          "";
        setProductName(productNameFromData);
        console.log("Product Name:", productNameFromData);
      })
      .catch((error) => {
        console.error("Error fetching assets:", error);
      });
  }, []);

  return (
    <Card className="w-2 h-full">
      <div className="sidebar">
        <Button
          className="p-button-text"
          label="New Asset"
          onClick={handleNewAsset}
        />
        <div>
          <p>List Assets</p>
          <ul className="asset-list">
            {assets.map((asset, index) => (
              <li key={index}>
                <Checkbox
                  inputId={`checkbox${index}`}
                  checked={selectedAssets.includes(asset.id)}
                  onChange={() => handleSelectAsset(asset.id)}
                />
                <label htmlFor={`checkbox${index}`}>
                  {
                    asset["http://www.industry-fusion.org/schema#product_name"]
                      ?.value
                  }
                </label>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
};

export default Container;
