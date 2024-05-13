import FactoryShopFloorForm from "@/components/factoryShopFloorForm/formview-shopfloor";
import ShopFloorList from "@/components/shopfloor-list";
import "../../../styles/factory-shopfloor.css"
import { Button } from "primereact/button";
import { useEffect, useState } from "react";
import { InputSwitch } from "primereact/inputswitch";
import { useRouter } from "next/router";
import Cookies from "js-cookie";
import HorizontalNavbar from "@/components/navBar/horizontal-navbar";
import { ShopFloorProvider } from "@/context/shopfloor-context";
import AllocatedAsset from "@/components/factoryShopFloorForm/allocated-asset";
import { FactoryShopFloorProvider } from "@/context/factory-shopfloor-context";
import Footer from "@/components/navBar/footer";
import PicklistAssets from "@/components/factoryShopFloorForm/picklist-assets";
import Header from "@/components/factoryShopFloorForm/header";

const FactoryShopFloor = () => {

    const [formViewPage, setFormViewPage]= useState(true);

    return (
        <>
            <div style={{ overflow: "hidden", height: "95vh" }}>
                <HorizontalNavbar />
                <FactoryShopFloorProvider>
                  
                    <div className="factory-shopfloor-container">
                        <ShopFloorProvider>
                            <div className="shopfloor-list-container">
                                <ShopFloorList 
                                formViewPage={formViewPage}
                                />
                                <div>
                                    <AllocatedAsset />
                                </div>
                            </div>
                            <div className="form-container" style={{zoom:"90%"}}>
                                < FactoryShopFloorForm />
                            </div>
                            <div className="allocated-list-container" >
                                <PicklistAssets />
                            </div>

                        </ShopFloorProvider>
                    </div>
                    <Footer />
                </FactoryShopFloorProvider>
            </div>
        </>
    )
}

export default FactoryShopFloor;