import FactoryShopFloorForm from "@/components/factoryShopFloorForm/formview-shopfloor";
import ShopFloorList from "@/components/shopfloor-list";
import UnallocatedAssets from "@/components/unallocated-assets";
import "../../../styles/factory-shopfloor.css"
import { Button } from "primereact/button";
import { useEffect, useState } from "react";
import { InputSwitch } from "primereact/inputswitch";
import { useRouter } from "next/router";
import Cookies from "js-cookie";
import HorizontalNavbar from "@/components/horizontal-navbar";
import { ShopFloorProvider } from "@/context/shopfloor-context";
import UnallocatedAsset from "@/components/factoryShopFloorForm/unallocated-asset";
import AllocatedAsset from "@/components/factoryShopFloorForm/allocated-asset";
import { getShopFloorAssets } from "@/utility/factory-site-utility";

const FactoryShopFloor = () => {

    const factoryId = "urn:ngsi-ld:factories:2:64";
    const [shopfloor, setShopfloor] = useState({});
    const [asset, setAsset] = useState({});
    const [switchView, setSwitchView] = useState(false);
    const router = useRouter();
    console.log("shopfloor", shopfloor);

    useEffect(() => {
        if (Cookies.get("login_flag") === "false") {
            router.push("/login");
        } else if (router.isReady) {
            const id = Array.isArray(router.query.factoryId) ? router.query.factoryId[0] : router.query.factoryId;
        }

    }, [router.isReady]);

    const fetchShopFloorAssets = async () => {
        try {
            const response = await getShopFloorAssets(shopfloor?.id);
            console.log("all shopfloor assets", response);
        } catch (error) {
            console.error(error)
        }
    }

    useEffect(() => {
        fetchShopFloorAssets();
    }, [shopfloor?.id])


    
    return (
        <>
            {/* <HorizontalNavbar /> */}
            <div style={{
                height: "96vh",
                overflow: "hidden",

            }}>
                <div className="flex justify-content-between px-5 factory-header">
                    <h1 className="factory-heading">Test1</h1>
                    <div className="mt-5 flex align-items-center gap-2">
                        <span>Switch View</span>
                        <InputSwitch checked={switchView} onChange={(e) => {
                            setSwitchView(e.value);
                            router.push(`/factory-site/shop-floor/${factoryId}`)
                        }} />
                    </div>

                </div>
                <div className="factory-shopfloor-container">
                    <ShopFloorProvider>
                        <div className="shopfloor-list-container">
                            <ShopFloorList
                                factoryId={factoryId}
                                setShopfloorProp={setShopfloor}
                            />
                            <div>
                                <AllocatedAsset />
                            </div>
                        </div>

                        <div className="form-container">
                            < FactoryShopFloorForm
                                shopfloorProp={shopfloor}
                                assetProp={asset}
                            />
                        </div>
                        <div className="allocated-list-container" >
                            <div className="flex gap-4">
                                <h4>ShopFloor Assets</h4>
                                <UnallocatedAsset />
                            </div>
                            {/* <UnallocatedAssets
                            factoryId={factoryId}
                            setAssetProp={setAsset}
                        /> */}

                        </div>
                    </ShopFloorProvider>
                </div>
            </div>

        </>
    )
}

export default FactoryShopFloor;