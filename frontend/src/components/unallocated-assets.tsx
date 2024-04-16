import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  getNonShopFloorAsset,
  getNonShopFloorAssetDetails,
  fetchAllocatedAssets,
} from "@/utility/factory-site-utility";
// import { Asset } from "../interfaces/assetTypes";
import "../styles/asset-list.css";
import { Card } from "primereact/card";
import Cookies from "js-cookie";
import { useRouter } from "next/router";
import { InputText } from "primereact/inputtext";
import { AllocatedAsset } from "@/interfaces/asset-types";
import { Menu } from 'primereact/menu';
import { Button } from 'primereact/button';
import { Checkbox } from "primereact/checkbox";

interface AssetProperty {
  type: "Property";
  value: string;
  observedAt?: string;
}

interface AssetListProps {
  factoryId: string;
  product_name?: string;
  setAssetProp?: React.Dispatch<React.SetStateAction<{ [key: string]: any; }>>;
}

interface AssetRelationship {
  type: "Relationship";
  class?: AssetProperty;
  object: string;
}

interface Asset {
  id: string;
  product_name: string;
  asset_category: string;
  [key: string]: AssetProperty | AssetRelationship | string | undefined;
}

const UnallocatedAssets: React.FC<AssetListProps> = ({
  factoryId,
  product_name,
  setAssetProp
}) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // const [selectedAssetDetails, setSelectedAssetDetails] = useState<any>(null);
  const router = useRouter();
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [allocatedAssets, setAllocatedAssets] = useState<AllocatedAsset[]>([]);
  const [assetCategories, setAssetCategories] = useState<string[]>([]);
  const [searchTermAllocated, setSearchTermAllocated] = useState("");
  const menu = useRef<Menu>(null);
  const [visible, setVisible] = useState(false);
  const allocatedMenu = useRef<Menu>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedCategoriesAllocated, setSelectedCategoriesAllocated] = useState<string[]>([]);

  let allocatedAssetsArray = null;


  useEffect(() => {
    const fetchNonShopFloorAssets = async (factoryId: string) => {
      try {
        const fetchedAssetIds = await getNonShopFloorAsset(factoryId);
        console.log("fetchedAssetIds", fetchedAssetIds)
        const fetchedAllocatedAssets = await fetchAllocatedAssets(factoryId);
        console.log("fetchedAllocatedAssets", fetchedAllocatedAssets)
        if (Array.isArray(fetchedAllocatedAssets) && fetchedAllocatedAssets.length > 0) {
          allocatedAssetsArray = fetchedAllocatedAssets;
        }
        // setAllocatedAssets(allocatedAssetsArray);

        // destructuring the asset id, product_name, asset_catagory for un-allocated Asset
        const fetchedAssets: Asset[] = Object.keys(fetchedAssetIds).map((key) => ({
          id: fetchedAssetIds[key].id,
          product_name: fetchedAssetIds[key].product_name?.value,
          asset_category: fetchedAssetIds[key].asset_category?.value,
        }));

        // destructuring the asset id, product_name, asset_catagory for allocated Asset
        const unifiedAllocatedAssets = Object.keys(fetchedAllocatedAssets).map(key => ({
          id: fetchedAllocatedAssets[key].id,
          product_name: fetchedAllocatedAssets[key]?.product_name,
          asset_category: fetchedAllocatedAssets[key]?.asset_category,
        }));

        // combined asset catagories from both allocated asset and un allocated asset
        const categories = Array.from(new Set([...fetchedAssets, ...unifiedAllocatedAssets].map(asset => asset.asset_category))).filter(Boolean);

        setAssetCategories(categories);

        setAssets(fetchedAssets);

        setAllocatedAssets(fetchedAllocatedAssets);

        setLoading(false);

      } catch (err) {

        setError("Failed to fetch assets");
        setLoading(false);
        allocatedAssetsArray = null;

      }
    };

    if (Cookies.get("login_flag") === "false") {
      router.push("/login");
    } else if (router.isReady) {
      // const id = Array.isArray(router.query.factoryId) ? router.query.factoryId[0] : router.query.factoryId;
      const id = factoryId;
      console.log("id here", id);

      if (typeof id === 'string') {
        fetchNonShopFloorAssets(id);
      }
    }
  }, [factoryId, router.isReady]);


  // const normalizedAllocatedAssets = Array.isArray(allocatedAssets) ? allocatedAssets : [allocatedAssets];
  useEffect(() => {
    const results = assets.filter(asset => {
      const matchesSearchTerm = asset.product_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategories = selectedCategories.length === 0 || selectedCategories.includes(asset.asset_category);
      return matchesSearchTerm && matchesCategories;
    });

    setFilteredAssets(results);
  }, [searchTerm, selectedCategories, assets]);


  // for allocated asset list : if we dont find any 200 response from backend , it will give the allocatedAssets.filter is not a function error
  // reason : when in alloctaed asset  urn:ngsi-ld:allocated-assets-store  in  scorpio we have other values then urn inside object array then we dont get 200 response from
  // allocated-asset backend endpoint
  const filteredAllocatedAssets = useMemo(() => {
    return allocatedAssets?.filter(asset =>
      (selectedCategoriesAllocated.length === 0 || selectedCategoriesAllocated.includes(asset.asset_category)) &&
      asset.product_name?.toLowerCase().includes(searchTermAllocated.toLowerCase())
    );
  }, [allocatedAssets, selectedCategoriesAllocated, searchTermAllocated]);


  const handleCategoryChange = (category: string) => {
    setSelectedCategories(prevCategories => {
      const categoryIndex = prevCategories.indexOf(category);
      if (categoryIndex > -1) {
        // If found, remove it
        return prevCategories.filter(c => c !== category);
      } else {
        // add it
        return [...prevCategories, category];
      }
    });
  };


  //unallocated assets Menu
  const menuItems = [
    {
      label: ' Asset Categories',
      items: assetCategories.map(category => ({
        template: () => (
          <div className="p-flex p-ai-center">
            <Checkbox inputId={category} onChange={() => handleCategoryChange(category)} checked={selectedCategories.includes(category)} />
            <label htmlFor={category} className="p-checkbox-label ml-2" style={{ cursor: "pointer" }}>
              {category}
            </label>
          </div>
        ),
      })),
    },
  ];


  //allocated Asset Menu
  const allocatedMenuItems = [
    {
      label: ' Asset Categories',
      items: assetCategories.map(category => ({
        template: () => (
          <div className="p-flex p-ai-center">
            <Checkbox inputId={category} onChange={() => handleAllocatedCategoryChange(category)} checked={selectedCategoriesAllocated.includes(category)} />
            <label htmlFor={category} className="p-checkbox-label ml-2" style={{ cursor: "pointer" }}>
              {category}
            </label>
          </div>
        ),
      })),
    },
  ];


  //allocated Asset check-box
  const handleAllocatedCategoryChange = (category: string) => {
    setSelectedCategoriesAllocated(prev => {
      const isAlreadySelected = prev.includes(category);
      if (isAlreadySelected) {
        return prev.filter(c => c !== category);
      } else {
        return [...prev, category];
      }
    });
  };


  const toggleMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    menu.current?.toggle(event);
    setVisible(!visible);
  };

  function handleDragStart(
    event: React.DragEvent,
    data: AllocatedAsset,
    type: string
  ) {
    const dragData = JSON.stringify({
      item: data,
      type: type,
    });
    event.dataTransfer.setData("application/json", dragData);
    event.dataTransfer.effectAllowed = "move";
    console.log(`Dragging: ${data}`, data);
  }

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <React.Fragment>
      <div style={{ height: "23rem", borderBottom: "1px solid #ccc" }}>
        <div className="flex mt-3 gap-2 ">
          <div className="p-input-icon-left">
            <i className="pi pi-search " style={{ color: "#050583" }} />
            <InputText
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search"
              className=" w-100"
            />
          </div>
          <div>
            <Button icon="pi pi-filter-fill" onClick={toggleMenu} aria-controls="popup_menu" aria-haspopup className="filter-button" style={{ color: "#050583", fontSize: "1.2em" }} />
            <Menu model={menuItems} popup ref={menu} id="popup_menu" style={{ marginLeft: "-15%" }} />
          </div>
        </div>
        <h3 className="font-medium text-xl asset-heading">
          Unallocated Assets
        </h3>
        <div style={{ height: "44rem" }}>
          <ul style={{ overflowY: "scroll", maxHeight: "35%",margin:"0px" }}>
            {filteredAssets.map((asset, index) => (
              <li
                style={{ fontSize: "16px", paddingBottom: "4px" }}
                key={index}
                draggable={true}
                onClick={() => setAssetProp(asset)}
                onDragStart={(e) => handleDragStart(e, asset, "asset")}
              >
                {asset.product_name}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div style={{ marginTop: "1rem" }}>
        <div className="flex gap-2">
          <div className="p-input-icon-left">
            <i className="pi pi-search" style={{ color: "#050583" }} />
            <InputText
              value={searchTermAllocated}
              onChange={(e) => setSearchTermAllocated(e.target.value)}
              placeholder="Search"
            />
          </div>
          <div>
            <Button
              icon="pi pi-filter-fill"
              onClick={(e) => allocatedMenu.current?.toggle(e)}
              aria-haspopup
              className="filter-button"
              style={{ color: "#050583", fontSize: "1.2em" }}
            />
            <Menu model={allocatedMenuItems} popup ref={allocatedMenu} style={{ marginLeft: "-20%", marginTop: "1" }} />
          </div>
        </div>
        <h3
          className="font-medium text-xl asset-heading"
        >
          Allocated Assets
        </h3>
        <Card style={{ paddingTop: "0" }}>
          <div style={{ height: "492px" }}>
            <ul style={{ overflowY: "scroll", maxHeight: "36%", margin: "0px" }}>
              {filteredAllocatedAssets.map((asset, index) => (
                <li
                  style={{ fontSize: "16px", paddingBottom: "4px" }}
                  key={index} draggable={true} onDragStart={(e) => handleDragStart(e, asset, "asset")}>
                  {typeof asset === 'string' ? asset : asset.product_name}
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>
    </React.Fragment>
  );
};

export default UnallocatedAssets;
