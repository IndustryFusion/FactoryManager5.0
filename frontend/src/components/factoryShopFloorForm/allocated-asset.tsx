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
import { Card } from "primereact/card";
import Cookies from "js-cookie";
import { useRouter } from "next/router";
import { InputText } from "primereact/inputtext";
import { AllocatedAssets } from "@/types/asset-types";
import { Menu } from 'primereact/menu';
import { Button } from 'primereact/button';
import { Checkbox } from "primereact/checkbox";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/state/store";
import { create } from "@/state/unAllocatedAsset/unAllocatedAssetSlice";
import { useFactoryShopFloor } from "@/context/factory-shopfloor-context";
import { useTranslation } from "next-i18next";

interface AssetProperty {
    type: "Property";
    value: string;
    observedAt?: string;
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
    [key: string]: AssetProperty | AssetRelationship | string ;
}


const AllocatedAsset = () => {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [allocatedAssets, setAllocatedAssets] = useState<AllocatedAssets[]>([]);
    const [assetCategories, setAssetCategories] = useState<string[]>([]);
    const [searchTermAllocated, setSearchTermAllocated] = useState("");
    const allocatedMenu = useRef<Menu>(null);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [selectedCategoriesAllocated, setSelectedCategoriesAllocated] = useState<string[]>([]);
    let allocatedAssetsArray = null;
    let unAllocatedAssetData = useSelector((state: RootState) => state.unAllocatedAsset);
    const dispatch = useDispatch();
    const { selectItems, saveAllocatedAssets } = useFactoryShopFloor();
    const [factoryIdValue, setFactoryIdValue] = useState("");
    const [selectedAllocatedAsset, setSelectedAllocatedAsset] = useState<string | null>( null);
    const { t } = useTranslation('placeholder');

    const fetchNonShopFloorAssets = async (factoryId: string) => {
        try {
            if (unAllocatedAssetData.length === 0) {
                const fetchedAssetIds = await getNonShopFloorAsset(factoryId); // for unallocated assets
              
                dispatch(create(fetchedAssetIds));
            }
            const fetchedAllocatedAssets = await fetchAllocatedAssets(factoryId);
          
            if (Array.isArray(fetchedAllocatedAssets) && fetchedAllocatedAssets.length > 0) {
                allocatedAssetsArray = fetchedAllocatedAssets;
            }
          
            // destructuring the asset id, product_name, asset_catagory for un-allocated Asset
            const fetchedAssets :Asset[]= Object.keys(unAllocatedAssetData).map((key:{}) => ({
                id: unAllocatedAssetData[key].id,
                product_name: unAllocatedAssetData[key].product_name?.value,
                asset_category: unAllocatedAssetData[key].asset_category?.value,
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

    useEffect(() => {
        if (Cookies.get("login_flag") === "false") {
            router.push("/login");
        } else if (router.isReady) {       
            const id = Array.isArray(router.query.factoryId) ? router.query.factoryId[0] : router.query.factoryId;
            if (typeof id === 'string') {        
                fetchNonShopFloorAssets(id);
                setFactoryIdValue(id);
            }
        }
    }, [router.query.factoryId, router.isReady, unAllocatedAssetData,saveAllocatedAssets]);

    
    useEffect(() => {
        const results = assets.filter(asset => {
            const matchesSearchTerm = asset.product_name?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategories = selectedCategories.length === 0 || selectedCategories.includes(asset.asset_category);
            return matchesSearchTerm && matchesCategories;
        });
        setFilteredAssets(results);
    }, [searchTerm, selectedCategories, assets]);

   
    const filteredAllocatedAssets = useMemo(() => {
        if (!Array.isArray(allocatedAssets) || allocatedAssets.length === 0) {
            return [];
        }
        return allocatedAssets.filter(asset => {
            const productName = asset.product_name?.toLowerCase() ?? '';
            const isCategoryMatch = selectedCategoriesAllocated.length === 0 || selectedCategoriesAllocated.includes(asset.asset_category);
            const isSearchMatch = productName.includes(searchTermAllocated.toLowerCase());
            return isCategoryMatch && isSearchMatch;
        });
    }, [allocatedAssets, selectedCategoriesAllocated, searchTermAllocated]);

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

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <>
            <Card style={{ height: "50%", marginTop: "10px", overflowY: "scroll" }}>
                <h3
                    className="font-medium text-xl ml-4"
                    style={{ marginTop: "2%", marginLeft: "5%" }}
                >
                    Allocated Asset
                </h3>
                <div className="flex ml-3" >
                    <div className="p-input-icon-left" style={{ flex: "0 0 90%" }}>
                        <i className="pi pi-search" />
                        <InputText
                            style={{ width: "100%" }}
                            value={searchTermAllocated}
                            onChange={(e) => setSearchTermAllocated(e.target.value)}
                            placeholder={t('searchByName')}
                            className="w-120"
                        />
                    </div>
                    <div>
                        <Button
                            icon="pi pi-filter-fill"
                            onClick={(e) => allocatedMenu.current?.toggle(e)}
                            aria-haspopup
                            className="filter-button ml-1"
                            style={{ color: "grey", fontSize: "1.2em" }}
                        />

                        <Menu model={allocatedMenuItems} popup ref={allocatedMenu} style={{ marginLeft: "-20%", marginTop: "1" }} />

                    </div>
                </div>
                <div style={{ height: "220px" }}>
                    <ul>
                        {filteredAllocatedAssets.map((asset, index) => (
                            <li 
                            key={index} 
                            className="mb-2 ml-3 list-item"
                            onClick={() =>{
                                setSelectedAllocatedAsset(asset?.id)
                                selectItems(asset?.product_name, asset?.asset_category, asset?.id)}
                            }
                                
                              
                           style={{backgroundColor: selectedAllocatedAsset === asset.id ? "#e3e3e3a6" : "#fff"}} 
                            >
                                {typeof asset === 'string' ? asset : asset.product_name}
                            </li>
                        ))}

                    </ul>
                </div>

            </Card>
        </>
    )
}

export default AllocatedAsset;