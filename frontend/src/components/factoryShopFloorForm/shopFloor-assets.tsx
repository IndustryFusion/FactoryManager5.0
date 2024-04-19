import { getShopFloorAssets, fetchAllocatedAssets, getNonShopFloorAsset } from "@/utility/factory-site-utility";
import { PickList } from "primereact/picklist";
import { RootState } from "@/state/store";
import { create } from "@/state/unAllocatedAsset/unAllocatedAssetSlice";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/router";
import Cookies from "js-cookie";
import "../../styles/factory-shopfloor.css"
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


interface ShopFloorAssetsProps {
    shopFloorProp: { [key: string]: any; };
    setAssetProp: React.Dispatch<React.SetStateAction<{ [key: string]: any; }>>

}

const ShopFloorAssets: React.FC<ShopFloorAssetsProps> = ({ shopFloorProp, setAssetProp }) => {
    const [shopFloorAssets, setShopFloorAssets] = useState([]);
    const [source, setSource] = useState([]);
    const [target, setTarget] = useState([]);
    let unAllocatedAssetData = useSelector((state: RootState) => state.unAllocatedAsset);
    const dispatch = useDispatch();
    let allocatedAssetsArray = null;
    const router = useRouter();

    const fetchShopFloorAssets = async () => {
        console.log("is calling");
        try {
            const response = await getShopFloorAssets(shopFloorProp?.id);
            console.log("response from shopfloor ", response);

            const { assetsData } = response;
            setShopFloorAssets(assetsData);
            setSource(assetsData)
            // console.log("all shopfloor assets",  assetsData);
        } catch (error) {
            console.error(error)
        }
    }
    useEffect(() => {
        fetchShopFloorAssets();
    }, [shopFloorProp?.id]);

    useEffect(() => {
        const fetchNonShopFloorAssets = async (factoryId: string) => {
            console.log("is calling here in allocated asst");

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
                console.log("fetchedAssets", fetchedAssets);


                setTarget(fetchedAssets)

                // destructuring the asset id, product_name, asset_catagory for allocated Asset
                const unifiedAllocatedAssets = Object.keys(fetchedAllocatedAssets).map(key => ({
                    id: fetchedAllocatedAssets[key].id,
                    product_name: fetchedAllocatedAssets[key]?.product_name,
                    asset_category: fetchedAllocatedAssets[key]?.asset_category,
                }));

                // combined asset catagories from both allocated asset and un allocated asset
                const categories = Array.from(new Set([...fetchedAssets, ...unifiedAllocatedAssets].map(asset => asset.asset_category))).filter(Boolean);

                ;

            } catch (err) {

                // setError("Failed to fetch assets");
                // setLoading(false);
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


    const onChange = (event) => {
        setSource(event.source);
        setTarget(event.target);
    };

    const itemTemplate = (item) => {
        console.log("item template value", item["http://www.industry-fusion.org/schema#product_name"]?.value);
    
        // Check if source and target both have lengths
        const hasSource = source.length > 0;
        const hasTarget = target.length > 0;
    
        // Determine the product name based on the item data
        const sourceProductName = item["http://www.industry-fusion.org/schema#product_name"]?.value ;
        const targetProductName=  item.product_name;
    
        // Only one <li> should be displayed based on whether target has a length
        if (hasTarget) {
            return <li className="list-items">{targetProductName}</li>;
        } else if (hasSource) {
            return <li className="list-items" onClick={() => setAssetProp(item)}>{sourceProductName}</li>;
        }
    
        // Return null if neither source nor target have lengths
        return null;
    };
    
const headerSource =(
    <div className="flex">
        <h3>ShopFloor Assets</h3>
        <Button>Save</Button>
    </div>
)

    return (
        <>
            <PickList dataKey="id" source={source} target={target}
                onChange={onChange}
                breakpoint="1280px"
                sourceHeader={ headerSource} targetHeader="Unallocated Assets"
                itemTemplate={itemTemplate} sourceStyle={{ height: '14rem' }} targetStyle={{ height: '14rem' }} />
        </>
    )
}

export default ShopFloorAssets;