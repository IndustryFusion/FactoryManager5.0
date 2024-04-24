import { RootState } from "@/state/store";
import { create } from "@/state/unAllocatedAsset/unAllocatedAssetSlice";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Menu } from 'primereact/menu';
import { AllocatedAsset } from "@/interfaces/asset-types";
import { useRouter } from "next/router";
import Cookies from "js-cookie";
import { fetchAllocatedAssets, getNonShopFloorAsset } from "@/utility/factory-site-utility";
import { Checkbox } from "primereact/checkbox";
import { Card } from "primereact/card";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";


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
    [key: string]: AssetProperty | AssetRelationship | string | undefined;
}

const UnallocatedAsset = () => {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const menu = useRef<Menu>(null);
    const [visible, setVisible] = useState(false);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [allocatedAssets, setAllocatedAssets] = useState<AllocatedAsset[]>([]);
    const [assetCategories, setAssetCategories] = useState<string[]>([]);
    let unAllocatedAssetData = useSelector((state: RootState) => state.unAllocatedAsset);
    // console.log('unAllocatedAssets from redux ', unAllocatedAssetData);
    const dispatch = useDispatch();
    let allocatedAssetsArray = null;
    const router = useRouter();


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
                const fetchedAssets: Asset[] = Object.keys(unAllocatedAssetData).map((key) => ({
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

    }, [router.query.factoryId, router.isReady, unAllocatedAssetData]);

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

    const toggleMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
        menu.current?.toggle(event);
        setVisible(!visible);
    };

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
                        <Button icon="pi pi-filter-fill" onClick={toggleMenu} aria-controls="popup_menu" aria-haspopup className="filter-button" style={{ color: "grey", fontSize: "1.2em" }} />
                        <Menu model={menuItems} popup ref={menu} id="popup_menu" style={{ marginLeft: "-15%" }} />
                    </div>

                </div>

                <ul>
                    {filteredAssets.map((asset, index) => (
                        <li
                            key={index}
                            // onClick={() => handleAssetClick(asset.id)}         
                            style={{
                                position: "relative",
                                cursor: "pointer",
                                padding: "10px 20px",
                                marginBottom: "5px",
                                borderRadius: "5px",
                            }}
                            className="mb-2 ml-2"
                        >
                            {asset.product_name}
                        </li>
                    ))}
                </ul>
            </Card>
        </>
    )
}

export default UnallocatedAsset;