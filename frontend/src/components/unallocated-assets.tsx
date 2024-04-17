import React, { useEffect, useState,useRef,useMemo } from "react";
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
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/state/store";
import { create } from "@/state/unAllocatedAsset/unAllocatedAssetSlice";

interface AssetProperty {
  type: "Property";
  value: string;
  observedAt?: string;
}

interface AssetListProps {
  factoryId: string;
  product_name: string;
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
  const allocatedMenu =useRef<Menu>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedCategoriesAllocated, setSelectedCategoriesAllocated] = useState<string[]>([]);
   
  let allocatedAssetsArray = null;
  let unAllocatedAssetData = useSelector((state: RootState) => state.unAllocatedAsset);
  console.log('unAllocatedAssets from redux ',unAllocatedAssetData);
  const dispatch = useDispatch();


  useEffect(() => {
    const fetchNonShopFloorAssets = async (factoryId: string) => {
      try {
        if (unAllocatedAssetData.length === 0) {
        const fetchedAssetIds = await getNonShopFloorAsset(factoryId);
        console.log("fetchedAssetIds", fetchedAssetIds);
        dispatch(create(fetchedAssetIds));
        }
        const fetchedAllocatedAssets = await fetchAllocatedAssets(factoryId); 
        console.log("fetchedAllocatedAssets", fetchedAllocatedAssets)
        if (Array.isArray(fetchedAllocatedAssets) && fetchedAllocatedAssets.length > 0) {
          allocatedAssetsArray = fetchedAllocatedAssets;
        }
        // setAllocatedAssets(allocatedAssetsArray);

        // destructuring the asset id, product_name, asset_catagory for un-allocated Asset
        const fetchedAssets:  Asset[]  = Object.keys(unAllocatedAssetData).map((key) => ({
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
            <Checkbox inputId={category} onChange={() => handleCategoryChange(category)} checked={selectedCategories.includes(category)}  />
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
            <Checkbox inputId={category} onChange={() => handleAllocatedCategoryChange(category)} checked={selectedCategoriesAllocated.includes(category)}  />
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


  const toggleMenu = (event:React.MouseEvent<HTMLButtonElement>) => {
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
    <>
  
      <Card style={{ height: "60%", overflowY: "scroll" }}>
        <h3
          className="font-medium text-xl ml-4"
          style={{ marginTop: "2%", marginLeft: "5%" }}
        >
          Unallocated Assets
        </h3>
        <div className="flex ml-2">
         <div className="p-input-icon-left">
          <i className="pi pi-search ml-2" />
          <InputText
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name..."
            className="ml-2 w-120"
          />
           
        </div>
       <div>
         <Button icon="pi pi-filter-fill" onClick={toggleMenu} aria-controls="popup_menu" aria-haspopup  className="filter-button"  style={{ color: "grey", fontSize: "1.2em" }} />
          <Menu model={menuItems} popup ref={menu} id="popup_menu"  style={{marginLeft:"-15%"}}/>
       </div>

        </div>
       
        <ul>
          {filteredAssets.map((asset, index) => (
            <li
              key={index}
              draggable={true}
              // onClick={() => handleAssetClick(asset.id)}
              onDragStart={(e) => handleDragStart(e, asset, "asset")}
               style={{
                  position: "relative",
                  cursor: "pointer",
                  padding: "10px 20px",
                  marginBottom: "5px",
                 
                  borderRadius: "5px",
                  // backgroundColor: selectedShopFloorId === asset.id ? "lightgrey" : "transparent",
                }}
                className="mb-2 ml-2"
            >
               {/* <span style={{
                  position: "absolute",
                  left: "0",
                  top: "50%",
                  transform: "translateY(-50%)",
                  height: "10px",
                  width: "10px",
                  backgroundColor: "#164B60", // Initial color set, animation will override this during cycles
                  borderRadius: "50%",
                  animation: "colorDip 2s infinite",
                }} /> */}
              {asset.product_name}
            </li>
          ))}
        </ul>
      </Card>
      <Card style={{ height: "38%", marginTop: "10px", overflowY: "scroll" }}>
        <h3
          className="font-medium text-xl ml-4"
          style={{ marginTop: "2%", marginLeft: "5%" }}
        >
          Allocated Asset
        </h3>
           <div className="flex ml-3">
            <div className="p-input-icon-left">
          <i className="pi pi-search" />
          <InputText
            value={searchTermAllocated}
            onChange={(e) => setSearchTermAllocated(e.target.value)}
            placeholder="Search by name..."
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

            <Menu model={allocatedMenuItems} popup ref={allocatedMenu} style={{marginLeft:"-20%",marginTop:"1"}} />
          
          </div>
       
        </div>
       <ul>
          {filteredAllocatedAssets.map((asset, index) => (
            <li key={index} draggable={true} onDragStart={(e) => handleDragStart(e, asset, "asset")} className="mb-2 ml-3">
              {typeof asset === 'string' ? asset : asset.product_name}
            </li>
           ))}
        </ul>
      </Card>
    </>
  );
};

export default UnallocatedAssets;
