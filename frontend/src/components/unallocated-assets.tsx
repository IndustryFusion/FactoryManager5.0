import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  getNonShopFloorAsset,
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
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/state/store";
import { create } from "@/state/unAllocatedAsset/unAllocatedAssetSlice";
import { TabView, TabPanel } from 'primereact/tabview';


interface AssetListProps {
  factoryId: string;
  product_name: string;
}

interface Asset {
  id: string;
  product_name: string;
  asset_category: string;
 [key: string]:any,
}

const UnallocatedAssets: React.FC<AssetListProps> = ({
  factoryId,
  product_name,
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
  const [showAllocated, setShowAllocated] = useState(false); // New state to toggle views
  const [view, setView] = useState('unallocated');
  let allocatedAssetsArray = null;
  let unAllocatedAssetData = useSelector((state: RootState) => state.unAllocatedAsset);
  // console.log('unAllocatedAssets from redux ', unAllocatedAssetData);
  const dispatch = useDispatch();

 const fetchNonShopFloorAssets = async (factoryId: string) => {
      try {
        if (unAllocatedAssetData.length === 0) {
          const fetchedAssetIds = await getNonShopFloorAsset(factoryId);
          // console.log("fetchedAssetIds", fetchedAssetIds);
          dispatch(create(fetchedAssetIds));
        }
        const fetchedAllocatedAssets = await fetchAllocatedAssets(factoryId);
        // console.log("fetchedAllocatedAssets", fetchedAllocatedAssets)
        if (Array.isArray(fetchedAllocatedAssets) && fetchedAllocatedAssets.length > 0) {
          allocatedAssetsArray = fetchedAllocatedAssets;
          setAllocatedAssets(fetchedAllocatedAssets);
        }
        // destructuring the asset id, product_name, asset_catagory for un-allocated Asset
      const fetchedUnallocatedAssets: Asset[] = Object.keys(unAllocatedAssetData).map((key:any) => {
      const asset = unAllocatedAssetData[key];
      return {
        id: asset.id,
        product_name: asset.product_name?.value ,
        asset_category: asset.asset_category?.value 
       };
      });
        // destructuring the asset id, product_name, asset_catagory for allocated Asset
      const unifiedAllocatedAssets = fetchedAllocatedAssets.map((asset:Asset) => ({
      id: asset.id,
      product_name: asset.product_name , 
      asset_category: asset.asset_category
    }));

        // combined asset catagories from both allocated asset and un allocated asset
      const categories = Array.from(new Set([...fetchedUnallocatedAssets, ...unifiedAllocatedAssets].map(asset => asset.asset_category))).filter(Boolean);

      setAssetCategories(categories);
      setAssets(fetchedUnallocatedAssets);
    
      setLoading(false);

      } catch (err) {

        setError("Failed to fetch assets");
        setLoading(false);
        allocatedAssetsArray = null;

      }
    };

  useEffect(() => {
    if(factoryId){
      fetchNonShopFloorAssets(factoryId)
    }
    if (Cookies.get("login_flag") === "false") {
      router.push("/login");
    } else if (router.isReady) {
      const id = Array.isArray(router.query.factoryId) ? router.query.factoryId[0] : router.query.factoryId;
      if (typeof id === 'string') {
        fetchNonShopFloorAssets(id);
      }
    }

  }, [factoryId, router.isReady, unAllocatedAssetData]);

  useEffect(() => {
    const results = assets.filter(asset => {
      const matchesSearchTerm = asset.product_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategories = selectedCategories.length === 0 || selectedCategories.includes(asset.asset_category);

      return matchesSearchTerm && matchesCategories;

    });
    setFilteredAssets(results);
  }, [searchTerm, selectedCategories, assets]);


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
    // console.log(`Dragging: ${data}`, data);
  }

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  const handleSearchChange = (value: string) => {
    setSearchTerm(value.toLowerCase());
  };
return (
    <>
   <div className="flex flex-column align-items-center mt-3 mb-3" style={{ height: '95%', overflowY: 'auto' }}>
      <div className="flex align-items-center justify-content-center gap-2 mb-4">
        <InputText
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search by name..."
          style={{width: "320px"}}
        />
        <Button icon="pi pi-filter-fill" onClick={(e) => menu.current?.toggle(e)}    style={{ backgroundColor: "white", borderColor: "darkgrey", color: "grey", border:"none"}} />
        <Menu model={[
          {
            label: 'Asset Categories',
            items: assetCategories.map(category => ({
              template: () => (
                <div className="p-flex p-ai-center">
                  <Checkbox inputId={category} onChange={() => handleCategoryChange(category)} checked={selectedCategories.includes(category)} />
                  <label htmlFor={category} className="p-checkbox-label ml-2">{category}</label>
                </div>
              ),
            })),
          },
        ]} popup ref={menu} style={{marginLeft:"-20%"}} />
      </div>

      <TabView className="ml-1 "  >
        <TabPanel header="Unallocated Assets" style={{ height: '93%', overflowY: 'auto' }}>
          <Card className="-ml-1" >
            <ul>
              {assets.filter(asset => 
                asset.product_name?.toLowerCase().includes(searchTerm) && 
                (selectedCategories.length === 0 || selectedCategories.includes(asset.asset_category))
              ).map((asset, index) => (
                <li key={index} className="mb-2 ml-4 -mt-2" draggable={true} onDragStart={(e) => handleDragStart(e, asset, "asset")}>
                  {asset.product_name}
                </li>
              ))}
            </ul>
          </Card>
        </TabPanel>
        <TabPanel header="Allocated Assets" className="-ml-2">
          <Card className="-ml-1"  style={{ height: '93%', overflowY: 'auto' }}>
            <ul>
              {allocatedAssets.filter(asset => 
                asset.product_name?.toLowerCase().includes(searchTerm) && 
                (selectedCategories.length === 0 || selectedCategories.includes(asset.asset_category))
              ).map((asset, index) => (
                <li key={index} className="mb-2 ml-4" draggable={true} onDragStart={(e) => handleDragStart(e, asset, "asset")}>
                  {asset.product_name}
                </li>
              ))}
            </ul>
          </Card>
        </TabPanel>
      </TabView>
    </div>
    </>
  );
};

export default UnallocatedAssets;
