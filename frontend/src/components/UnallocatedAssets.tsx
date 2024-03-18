import React, { useEffect, useState,useRef,useMemo } from "react";
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
import { Menu } from 'primereact/menu';
import { Button } from 'primereact/button';
import { Checkbox } from "primereact/checkbox";
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
  const router = useRouter();
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [allocatedAssets, setAllocatedAssets] = useState<AllocatedAsset[]>([]);
  const [assetCategories, setAssetCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCategoryAllocated, setSelectedCategoryAllocated] = useState<string | null>(null);
  const [searchTermAllocated, setSearchTermAllocated] = useState("");
  const menu = useRef<any>(null);
  const [visible, setVisible] = useState(false);
  const allocatedMenu = useRef<any>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedCategoriesAllocated, setSelectedCategoriesAllocated] = useState<string[]>([]);
 

  useEffect(() => {
    const fetchNonShopFloorAssets = async (factoryId: any) => {
      try {
        const fetchedAssetIds = await getNonShopFloorAsset(factoryId);
        const fetchedAllocatedAssets = await fetchAllocatedAssets(); 


        const fetchedAssets: any = Object.keys(fetchedAssetIds).map((key) => ({
          id: fetchedAssetIds[key].id,
          product_name: fetchedAssetIds[key].product_name?.value,
          asset_category: fetchedAssetIds[key].asset_category?.value,
        }));

        
        const unifiedAllocatedAssets = Object.keys(fetchedAllocatedAssets).map(key => ({
          id: fetchedAllocatedAssets[key].id,
          product_name: fetchedAllocatedAssets[key].product_name?.value,
          asset_category: fetchedAllocatedAssets[key].asset_category?.value,
        }));

    
       
        const categories = Array.from(new Set([...fetchedAssets, ...unifiedAllocatedAssets].map(asset => asset.asset_category))).filter(Boolean);

        setAssetCategories(categories);

        setAssets(fetchedAssets);
      
        setAllocatedAssets(fetchedAllocatedAssets);
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


  const normalizedAllocatedAssets = Array.isArray(allocatedAssets) ? allocatedAssets : [allocatedAssets];
 useEffect(() => {
  const results = assets.filter(asset => {
    const matchesSearchTerm = asset.product_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory ? asset.asset_category === selectedCategory : true;
    return matchesSearchTerm && matchesCategory;
  });
  setFilteredAssets(results);
 
}, [searchTerm, selectedCategory, assets]);


//allocated asset checkbox 
const filteredAllocatedAssets = useMemo(() => {
  return allocatedAssets.filter(asset =>
    (selectedCategoriesAllocated.length === 0 || selectedCategoriesAllocated.includes(asset.asset_category)) &&
    asset.product_name.toLowerCase().includes(searchTermAllocated.toLowerCase())
  );
}, [allocatedAssets, selectedCategoriesAllocated, searchTermAllocated]); // Add searchTermAllocated as a dependency

 const handleCategoryChange = (category: string) => {
    setSelectedCategories(prev => {
      const isAlreadySelected = prev.includes(category);
      if (isAlreadySelected) {
        return prev.filter(c => c !== category); 
      } else {
        return [...prev, category]; 
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



  const handleAllocatedCategoryChange = (category: string) => {
    setSelectedCategoriesAllocated(prev => {
      const isAlreadySelected = prev.includes(category);
      if (isAlreadySelected) {

        console.log("allocated list  1 ", prev.filter(c => c !== category))
        return prev.filter(c => c !== category); 
      } else {
        console.log("allocated list  2 ", [...prev, category])
        return [...prev, category]; 
      }
    });
  };



  const toggleMenu = (event:any) => {
    menu.current.toggle(event);
    setVisible(!visible);
  };
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
          <i className="pi pi-search ml-2" />
          <InputText
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name..."
            className="ml-2 w-100"
          />
            <Button icon="pi pi-filter-fill" onClick={toggleMenu} aria-controls="popup_menu" aria-haspopup  className="filter-button"  style={{ color: "grey", fontSize: "1.2em" }} />
            <Menu model={menuItems} popup ref={menu} id="popup_menu"  style={{marginLeft:"-15%"}}/>
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

          <div className="p-input-icon-left">
          <i className="pi pi-search" />
          <InputText
            value={searchTermAllocated}
            onChange={(e) => setSearchTermAllocated(e.target.value)}
            placeholder="Search by name..."
          />
        <Button
            icon="pi pi-filter-fill"
            onClick={(e) => allocatedMenu.current.toggle(e)}
            aria-haspopup
            className="filter-button"
           style={{ color: "grey", fontSize: "1.2em" }}
          />

          <Menu model={allocatedMenuItems} popup ref={allocatedMenu} style={{marginLeft:"-20%"}} />
        </div>
       <ul>
          {filteredAllocatedAssets.map((asset, index) => (
            <li key={index} draggable={true} onDragStart={(e) => handleDragStart(e, asset, "asset")}>
              {typeof asset === 'string' ? asset : asset.product_name}
            </li>
           ))}
        </ul>
      </Card>
    </React.Fragment>
  );
};

export default UnallocatedAssets;
