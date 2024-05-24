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

import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  getNonShopFloorAsset,
  fetchAllocatedAssets,
} from "@/utility/factory-site-utility";
import "../../styles/asset-list.css";
import Cookies from "js-cookie";
import { useRouter } from "next/router";
import { InputText } from "primereact/inputtext";
import { AllocatedAssets } from "../../types/asset-types";
import { Menu } from 'primereact/menu';
import { Button } from 'primereact/button';
import { Checkbox } from "primereact/checkbox";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/state/store";
import { create } from "@/state/unAllocatedAsset/unAllocatedAssetSlice";
import { TabView, TabPanel } from 'primereact/tabview';
import { useTranslation } from "next-i18next";

interface AssetListProps {
  factoryId: string;
  product_name: string;
}

interface Asset {
  id: string;
  product_name: string;
  asset_category: string;
 [key: string]:string,
}

const UnallocatedAndAllocatedAssets: React.FC<AssetListProps> = ({
  factoryId,
  product_name,
}) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [allocatedAssets, setAllocatedAssets] = useState<AllocatedAssets[]>([]);
  const [assetCategories, setAssetCategories] = useState<string[]>([]);
  const menu = useRef<Menu>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const { t } = useTranslation(['placeholder', 'reactflow']);
  let allocatedAssetsArray = null;
  let unAllocatedAssetData = useSelector((state: RootState) => state.unAllocatedAsset);

  const dispatch = useDispatch();
  const [selectedUnallocatedAsset, setSelectedUnallocatedAsset] = useState<string | null>( null);
  const [selectedAllocatedAsset, setSelectedAllocatedAsset] = useState<string | null>( null);

 const getAllocatedAndUnallocatedAssets = async (factoryId: string) => {
      try {
        if (unAllocatedAssetData.length === 0) {
          const fetchedAssetIds = await getNonShopFloorAsset(factoryId);
    
          dispatch(create(fetchedAssetIds));
        }
        
        const fetchedAllocatedAssets = await fetchAllocatedAssets(factoryId);

        if (Array.isArray(fetchedAllocatedAssets)) {
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
        console.log("Error : fetchNonShopFloorAssets  from @component/unallocated-asssets.tsx")
        return [];
       
      }
    };

  useEffect(() => {

    if (Cookies.get("login_flag") === "false") {
      router.push("/login");
    } else if (router.isReady) {
      const id = Array.isArray(router.query.factoryId) ? router.query.factoryId[0] : router.query.factoryId;
      if (typeof id === 'string') {
        getAllocatedAndUnallocatedAssets(id);
      }
    }

  }, [factoryId, router.isReady, unAllocatedAssetData]);

  useEffect(() => {
    const results = assets.filter(asset => {
      const matchesSearchTerm = asset.product_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategories = selectedCategories.length === 0 || selectedCategories.includes(asset.asset_category);

      return matchesSearchTerm && matchesCategories;

    });
   
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
    data: AllocatedAssets,
    type: string
  ) {
    const dragData = JSON.stringify({
      item: data,
      type: type,
    });
    event.dataTransfer.setData("application/json", dragData);
    event.dataTransfer.effectAllowed = "move";
  }

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  const handleSearchChange = (value: string) => {
    setSearchTerm(value.toLowerCase());
  };
return (
    <>
   <div className="flex flex-column align-items-center mt-3 mb-3" style={{ height: '80%' }}>
      <div className="flex align-items-center justify-content-center gap-2 mb-4">
        <InputText
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder={t('placeholder:searchByName')}
          style={{width: "350px"}}
          className="mt-2"
        />
        <Button icon="pi pi-filter-fill" onClick={(e) => menu.current?.toggle(e)}    style={{ backgroundColor: "white", borderColor: "darkgrey", color: "grey", border:"none"}} className="mt-2" />
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

      <TabView className="ml-1" >
        <TabPanel header={t('reactflow:unAllocatedAsset')} >
            <ul className="-ml-2">
              {assets.filter(asset => 
                asset.product_name?.toLowerCase().includes(searchTerm) && 
                (selectedCategories.length === 0 || selectedCategories.includes(asset.asset_category))
              ).map((asset, index) => (
                <li 
                key={index} 
                className="mb-4 ml-4  list-item" 
                onClick={()=>setSelectedUnallocatedAsset(asset?.id)}
                draggable={true} 
                onDragStart={(e) => handleDragStart(e, asset, "asset")}
                style={{backgroundColor: selectedUnallocatedAsset === asset?.id? "#e3e3e3a6" : "#fff",}}
                >
                  {asset.product_name}
                </li>
              ))}
            </ul>
        </TabPanel>
        <TabPanel header={t('reactflow:allocatedAsset')} className="-ml-2" >
            <ul className="-ml-1">
              {allocatedAssets.filter(asset => 
                asset.product_name?.toLowerCase().includes(searchTerm) && 
                (selectedCategories.length === 0 || selectedCategories.includes(asset.asset_category))
              ).map((asset, index) => (
                <li 
                key={index} 
                className="mb-4 ml-4 list-item" 
                draggable={true} 
                onDragStart={(e) => handleDragStart(e, asset, "asset")}
                onClick={()=> setSelectedAllocatedAsset(asset?.id)}
                style={{backgroundColor: selectedAllocatedAsset === asset?.id? "#e3e3e3a6" : "#fff",}}
                >
                  {asset.product_name}
                </li>
              ))}
            </ul>
        </TabPanel>
      </TabView>
    </div>
    </>
  );
};

export default UnallocatedAndAllocatedAssets;
