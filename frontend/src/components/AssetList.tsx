import React, { useEffect, useState } from "react";
import {
  getNonShopFloorAsset,
  getNonShopFloorAssetDetails,
} from "@/utility/factory-site-utility";
import { Asset } from "../interfaces/assetTypes";

interface AssetListProps {
  factoryId: string;
}

import { ListBox } from "primereact/listbox";
const AssetList: React.FC<AssetListProps> = ({ factoryId }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAssetDetails, setSelectedAssetDetails] = useState<any>(null);
  const [assetRelations, setAssetRelations] = useState<string[]>([]);
  const [shopFloorAssets, setShopFloorAssets] = useState<{
    [key: string]: { type: string; object: string[] };
  }>({});
  const [selectedAsset, setSelectedAsset] = useState(null);
  useEffect(() => {
    const fetchNonShopFloorAssets = async () => {
      try {
        const fetchedAssetIds = await getNonShopFloorAsset(factoryId);
        const fetchedAssets: Asset[] = Object.keys(fetchedAssetIds).map(
          (key) => ({
            id: fetchedAssetIds[key],
          })
        );
        setAssets(fetchedAssets);

        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch non-shop-floor assets:", err);
        setError("Failed to fetch assets");
        setLoading(false);
      }
    };
    fetchNonShopFloorAssets();
  }, [factoryId]);

  const handleAssetClick = async (assetId: string) => {
    try {
      const assetDetails = await getNonShopFloorAssetDetails(assetId);
      setSelectedAssetDetails(assetDetails);
      const relations = extractRelations(assetDetails);
      setAssetRelations(relations);
    } catch (err) {
      console.error("Failed to fetch asset details:", err);
      setError("Failed to fetch asset details");
    }
  };

  const extractRelations = (assetDetails: any) => {
    return Object.keys(assetDetails)
      .filter((key) => key.startsWith("has"))
      .map((key) => key);
  };

  const renderRelations = () => {
    return assetRelations.length > 0 ? (
      <ul>
        {assetRelations.map((relation) => (
          <li
            key={relation}
            draggable={true}
            onDragStart={(event) =>
              handleDragStart(event, relation, "relation")
            }
          >
            {relation}
          </li>
        ))}
      </ul>
    ) : (
      <p>No relations found.</p>
    );
  };

  const onAssetChange = (e) => {
    setSelectedAsset(e.value);
    // Optionally, handle asset details fetching here
  };

  const listBoxAssets = assets.map((asset) => ({
    label: asset.name || `Asset ID: ${asset.id}`,
    value: asset.id,
  }));

  function handleDragStart(
    event: React.DragEvent,
    relation: any,
    type: string
  ) {
    // Assuming 'relation' is an object that includes both 'id' and 'name'
    const dragData = JSON.stringify({
      item: relation, // Now 'item' includes both ID and name
      type: type,
    });
    event.dataTransfer.setData("application/json", dragData);
    event.dataTransfer.effectAllowed = "move";
  }

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h3>Non Shop Floor Assets</h3>
      <ul>
        {assets.map((asset, index) => (
          <li
            key={index}
            draggable={true}
            onClick={() => handleAssetClick(asset.id)}
            onDragStart={(e) => handleDragStart(e, asset, "asset")}
          >
            {asset.id} {asset.product_name}
          </li>
        ))}
      </ul>
      {selectedAssetDetails && (
        <div>
          <h4>Asset Relations</h4>
          {renderRelations()}
        </div>
      )}
    </div>
  );
};

export default AssetList;
