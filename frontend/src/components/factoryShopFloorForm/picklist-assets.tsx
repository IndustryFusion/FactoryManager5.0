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
import { useFactoryShopFloor } from "@/context/factory-shopfloor-context";
import axios from "axios";
import { Toast, ToastMessage } from "primereact/toast";
import { fetchFormAllocatedAsset } from "@/utility/asset-utility";

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
    relation: any[]
}




const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

const PicklistAssets = () => {
    const [shopFloorAssets, setShopFloorAssets] = useState([]);
    const [source, setSource] = useState([]);
    const [target, setTarget] = useState([]);
    let unAllocatedAssetData = useSelector((state: RootState) => state.unAllocatedAsset);
    const dispatch = useDispatch();
    const router = useRouter();
    const { selectItems, setAsset, relations, setSaveAllocatedAssets, shopFloorValue } = useFactoryShopFloor();
    const [factoryId, setFactoryId] = useState("")
    const toast = useRef<any>(null);
    let toastShown = false;
    let allocatedAssetsArray = null;



    const fetchShopFloorAssets = async () => {
        try {
            const response = await getShopFloorAssets(shopFloorValue?.id);
            const { assetsData } = response;
            console.log(response, 'response from shopfloor');
            if (assetsData.length === 0) {
                setAsset("")
            }
            setShopFloorAssets(assetsData);
            setSource(assetsData)
        } catch (error) {
            console.error(error)
        }
    }

    useEffect(() => {
        fetchShopFloorAssets();
    }, [shopFloorValue?.id]);

    useEffect(() => {
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
                }
                // setAllocatedAssets(allocatedAssetsArray);

                // destructuring the asset id, product_name, asset_catagory for un-allocated Asset
                console.log("unAllocatedAssetData", unAllocatedAssetData);
                const fetchedAssets: Asset[] = Object.keys(unAllocatedAssetData).map((key) => {
                    const relationsArr = [];
                    // console.log(unAllocatedAssetData[key], "its object here");
                    const checkHas = 'http://www.industry-fusion.org/schema#has';

                    Object.keys(unAllocatedAssetData[key]).forEach(innerKey => {
                        // Check if the innerKey starts with the specified string
                        if (innerKey.startsWith(checkHas)) {
                            const modifiedKey = innerKey.replace('http://www.industry-fusion.org/schema#', '');
                            relationsArr.push(modifiedKey);
                        }
                    });

                    return ({
                        id: unAllocatedAssetData[key].id,
                        product_name: unAllocatedAssetData[key].product_name?.value,
                        asset_category: unAllocatedAssetData[key].asset_category?.value,
                        relation: relationsArr
                    })
                }

                );
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

            } catch (err) {
               console.error(err)
            }
        };

        if (Cookies.get("login_flag") === "false") {
            router.push("/login");
        } else if (router.isReady) {
            const id = Array.isArray(router.query.factoryId) ? router.query.factoryId[0] :
                router.query.factoryId;
            if (typeof id === 'string') {
                fetchNonShopFloorAssets(id);
                setFactoryId(id);
            }
        }

    }, [router.query.factoryId, router.isReady, unAllocatedAssetData]);

    const showToast = (severity: ToastMessage['severity'], summary: string, message: string) => {
        toast.current?.show({ severity: severity, summary: summary, detail: message, life: 5000 });
    };

    const onChange = (event) => {
        setSource(event.source);
        setTarget(event.target);
    };

    const itemTemplate = (item) => {
        if (relations?.length > 0) {
            toastShown = true;
        }

        return (
            <>
                <li className="list-items" onClick={() => {
                    selectItems(item.product_name, item.asset_category, item?.id)//relation
                    source.forEach(sourceItem => {
                        if (sourceItem?.product_name === item.product_name) {
                            setAsset(item)
                            toastShown = true;
                        }
                    })
                    if (!toastShown) { // Check if toast has not been shown
                        showToast("warn", "Warning", "move asset to shopfloor assets");
                    }

                }}>{item.product_name}</li>
            </>
        )
    };

    const shopfloorAssetIds = source.map(asset => asset?.id)
    const getPayload = () => {
        const shopfloorObj = {
            [shopFloorValue?.id]: shopfloorAssetIds
        };
        console.log("shopfloorObj", shopfloorObj);
        return shopfloorObj;
    }

    const getAllocatedPayload = () => {
        const allocatedObj = {
            [factoryId]: shopfloorAssetIds
        }
        console.log("allocatedObj", allocatedObj);
        return allocatedObj;
    }

    const handleSaveShopFloors = async () => {
        const payload = getPayload();
        const url = `${API_URL}/shop-floor/update-asset`;
        try {
            const response = await axios.patch(url, payload, {
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                withCredentials: true,
            })
            console.log("response from shopfloors", response.data)
            if (response.data?.status === 204 && response.data?.success === true) {
                showToast("success", "success", "Shopfloor assets saved successfully")
            }

        } catch (error) {
            console.error(error);
        }
    }

    //factoryId and all assets urn  send
    const handleAllocatedAssets = async () => {
        const payloadObj = getAllocatedPayload();
        try {
            const response = await fetchFormAllocatedAsset(payloadObj);
            if (response?.data?.status === 201 && response?.data?.success === true) {
                showToast("success", "success", "saved to allocated assets successfully")
            }
            console.log("response from allocated asset", response?.data)

        } catch (error) {
            console.error(error);
        }
    }

    const headerSource = (
        <div className="flex justify-content-between align-items-center gap-3">
            <h3 style={{ fontSize: "16px" }}>ShopFloor Assets</h3>
            <Button onClick={() => {
                handleSaveShopFloors()
                handleAllocatedAssets()
                setSaveAllocatedAssets(true)
            }
            }>Save</Button>
        </div>
    )

    return (
        <>
            <Toast ref={toast} />
            <PickList dataKey="id" source={source} target={target}
                onChange={onChange}
                breakpoint="1280px"
                sourceHeader={headerSource} targetHeader="Unallocated Assets"
                itemTemplate={itemTemplate}
                sourceStyle={{ height: '21rem' }} targetStyle={{ height: '40rem' }} />
        </>
    )
}

export default PicklistAssets;