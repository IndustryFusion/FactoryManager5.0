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
import { fetchFactoryDetails, getShopFloorAssets } from "@/utility/factory-site-utility";
import { Card } from "primereact/card";

const FactoryShopFloor = () => {

    const factoryId = "urn:ngsi-ld:factories:2:64";
    const [shopfloor, setShopfloor] = useState({});
    const [asset, setAsset] = useState({});
    const [switchView, setSwitchView] = useState(false);
    const [factoryName, setFactoryName] = useState("");
    const [shopFloorAssets, setShopFloorAssets] = useState([]);
    const router = useRouter();
    console.log("shopfloor", shopfloor);


    const getFactoryDetails = async (factoryId) => {
        try {
            const response = await fetchFactoryDetails(factoryId);
            const factoryname = response["http://www.industry-fusion.org/schema#factory_name"]?.value
            setFactoryName(factoryname)
        } catch (error) {
            console.error(error);
        }
    }


    useEffect(() => {
        if (Cookies.get("login_flag") === "false") {
            router.push("/login");
        } else if (router.isReady) {
            const id = Array.isArray(router.query.factoryId) ? router.query.factoryId[0] :
                router.query.factoryId;
            getFactoryDetails(id);
        }

    }, [router.isReady]);

    const fetchShopFloorAssets = async () => {
        try {
            const response = await getShopFloorAssets(shopfloor?.id);
            const { assetsData } = response;
            setShopFloorAssets(assetsData)
            console.log("all shopfloor assets", response);
        } catch (error) {
            console.error(error)
        }
    }


    useEffect(() => {
        fetchShopFloorAssets();
    }, [shopfloor?.id]);

    console.log("asset here", asset);




    return (
        <>
            {/* <HorizontalNavbar /> */}
            <div style={{
                height: "96vh",
                overflow: "hidden",

            }}>
                <div className="flex justify-content-between px-5 factory-header">
                    <h3 className="factory-heading">{factoryName}</h3>
                    <div className=" flex align-items-center gap-2">
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
                            <div className="flex  asset-lists">
                                <Card>
                                    <h3
                                        className="font-medium  ml-4"
                                        style={{ marginTop: "2%", marginLeft: "5%", fontSize: "18px" }}
                                    >
                                        ShopFloor Assets
                                    </h3>
                                    {shopFloorAssets.map(assetData =>
                                        <li onClick={() => setAsset(assetData)}>{assetData["http://www.industry-fusion.org/schema#product_name"]?.value}</li>
                                    )}

                                </Card>
                                <div>
                                    <UnallocatedAsset />
                                </div>
                            </div>
                        </div>
                    </ShopFloorProvider>
                </div>
            </div>

        </>
    )
}

export default FactoryShopFloor;