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
import { PickList } from 'primereact/picklist';
import { Card } from "primereact/card";
import ShopFloorAssets from "@/components/factoryShopFloorForm/shopFloor-assets";
import { FactoryShopFloorProvider } from "@/context/factory-shopfloor-context";
import Footer from "@/components/footer";

const FactoryShopFloor = () => {


    const [shopfloor, setShopfloor] = useState({});
    const [asset, setAsset] = useState("");
    const [switchView, setSwitchView] = useState(false);
    const [factoryName, setFactoryName] = useState("");
    const [factoryIdValue, setfactoryIdvalue] = useState("");
    const router = useRouter();


    const getFactoryDetails = async (factoryId: string) => {
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
            // Use TypeScript's non-null assertion operator to assert that `id` is not undefined
            const id: string = Array.isArray(router.query.factoryId) ? router.query.factoryId[0]! : router.query.factoryId!;
            getFactoryDetails(id);
            setfactoryIdvalue(id);
        }

    }, [router.isReady]);




    return (
        <>
            {/* <HorizontalNavbar /> */}
            <FactoryShopFloorProvider>
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
                                router.push(`/factory-site/shop-floor/${factoryIdValue}`)
                            }} />
                        </div>

                    </div>
                    <div className="factory-shopfloor-container">
                        <div className="shopfloor-list-container">
                            <ShopFloorList
                                factoryId={factoryIdValue}
                                setShopfloorProp={setShopfloor}
                            />
                            <div>
                                <AllocatedAsset />
                            </div>
                        </div>
                        <div className="form-container">
                            < FactoryShopFloorForm
                                shopfloorProp={shopfloor}
                              

                            />
                        </div>
                        <div className="allocated-list-container" >
                            <ShopFloorAssets
                                shopFloorProp={shopfloor}
                               
                            />
                        </div>

                    </div>
                </div>
                <Footer />
            </FactoryShopFloorProvider>
        </>
    )
}

export default FactoryShopFloor;