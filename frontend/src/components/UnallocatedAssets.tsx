import React, { useEffect, useState } from "react";
import {
  getNonShopFloorAsset,
  getNonShopFloorAssetDetails,
  fetchAllocatedAssets,
} from "@/utility/factory-site-utility";
// import { Asset } from "../interfaces/assetTypes";
import "../styles/AssetList.css";
import { Card } from "primereact/card";
import Cookies from "js-cookie";
import { useRouter } from "next/router";
import { InputText } from "primereact/inputtext";
import { AllocatedAsset } from "@/interfaces/assetTypes";

interface AssetListProps {
  factoryId: string;
  product_name: string;
}
interface Asset {
  id: string;
  product_name: string;
  asset_category: string;
}

const UnallocatedAssets: React.FC<AssetListProps> = ({
  factoryId,
  product_name,
}) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAssetDetails, setSelectedAssetDetails] = useState<any>(null);
  const [assetRelations, setAssetRelations] = useState<string[]>([]);
  const [shopFloorAssets, setShopFloorAssets] = useState<{
    [key: string]: { type: string; object: string[] };
  }>({});
  const router = useRouter();
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  const [selectedAsset, setSelectedAsset] = useState(null);
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [allocatedAssets, setAllocatedAssets] = useState<
    AllocatedAsset[] | AllocatedAsset
  >([]);

  useEffect(() => {
    const fetchNonShopFloorAssets = async (factoryId: any) => {
      try {
        const fetchedAssetIds = await getNonShopFloorAsset(factoryId);
        console.log(fetchedAssetIds, "test1");
        const fetchedAssets: any = Object.keys(fetchedAssetIds).map((key) => ({
          id: fetchedAssetIds[key].id,
          product_name: fetchedAssetIds[key].product_name?.value,
          asset_category: fetchedAssetIds[key].asset_category?.value,
        }));
        setAssets(fetchedAssets);

        console.log(assets, "the unalocated asset");
        const allocatedAssets = await fetchAllocatedAssets();
        setAllocatedAssets(allocatedAssets);
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch non-shop-floor assets:", err);
        setError("Failed to fetch assets");
        setLoading(false);
      }
    };

    if (Cookies.get("login_flag") === "false") {
      router.push("/login");
    } else {
      if (router.isReady) {
        const { factoryId } = router.query;
        fetchNonShopFloorAssets(factoryId);
      }
    }
  }, [factoryId, router.isReady]);
  useEffect(() => {
    const results = assets.filter((asset) =>
      asset.product_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredAssets(results);
  }, [searchTerm, assets]);
  const handleAssetClick = async (assetId: string) => {
    try {
      const details = await getNonShopFloorAssetDetails(assetId);
      setSelectedAssetDetails(details);
    } catch (error) {
      console.error("Failed to fetch asset details:", error);
      setError("Failed to fetch asset details");
    }
  };

  const renderRelations = () => {
    if (!selectedAssetDetails)
      return (
        <p style={{ marginLeft: "5px" }}>
          No asset selected or no relations found.
        </p>
      );

    // Extracting relation names from the selected asset details
    const relations = Object.keys(selectedAssetDetails)
      .filter((key) =>
        key.startsWith("http://www.industry-fusion.org/schema#has")
      )
      .map((key) => ({
        key: key.replace("http://www.industry-fusion.org/schema#", ""),
        value: selectedAssetDetails[key],
      }));

    if (relations.length === 0)
      return <p>No relations found for this asset.</p>;

    return (
      <ul style={{ listStyleType: "none", padding: 0, margin: 0 }}>
        {relations.map((relation) => (
          <li
            key={relation.key}
            draggable="true"
            onDragStart={(e) => handleDragStart(e, relation.key, "relation")}
          >
            {relation.key}
          </li>
        ))}
      </ul>
    );
  };

  const onAssetChange = (e: any) => {
    setSelectedAsset(e.value);
  };

  function handleDragStart(
    event: React.DragEvent,
    relation: any,
    type: string
  ) {
    const dragData = JSON.stringify({
      item: relation,
      type: type,
    });
    event.dataTransfer.setData("application/json", dragData);
    event.dataTransfer.effectAllowed = "move";
    console.log(`Dragging: ${relation}`);
  }

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <React.Fragment>
      <Card style={{ height: "60%", overflowY: "scroll" }}>
        <h3
          className="font-medium text-xl"
          style={{ marginTop: "2%", marginLeft: "5%" }}
        >
          Unallocated Assets
        </h3>
        <div className="p-input-icon-left">
          <i className="pi pi-search" />
          <InputText
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name..."
          />
        </div>
        <ul>
          {filteredAssets.map((asset, index) => (
            <li
              key={index}
              draggable={true}
              onClick={() => handleAssetClick(asset.id)}
              onDragStart={(e) => handleDragStart(e, asset, "asset")}
            >
              {asset.product_name}
            </li>
          ))}
        </ul>
      </Card>
      <Card style={{ height: "38%", marginTop: "10px", overflowY: "scroll" }}>
        <h3
          className="font-medium text-xl"
          style={{ marginTop: "2%", marginLeft: "5%" }}
        >
          Allocated Asset
        </h3>
        {/* <ul>
          {Array.isArray(allocatedAssets) ? (
            allocatedAssets.map((asset, index) => (
              <li key={index} draggable={true}>
                {asset.id}
              </li>
            ))
          ) : (
            <li draggable={true}>{allocatedAssets.id}</li>
          )}
        </ul> */}
      </Card>
    </React.Fragment>
  );
};

export default UnallocatedAssets;
