import FactoryShopFloorForm from "@/components/factoryShopFloorForm/formview-shopfloor";
import ShopFloorList from "@/components/shopfloor-list";
import "../../../styles/factory-shopfloor.css"
import HorizontalNavbar from "@/components/horizontal-navbar";
import { ShopFloorProvider } from "@/context/shopfloor-context";
import AllocatedAsset from "@/components/factoryShopFloorForm/allocated-asset";
import { FactoryShopFloorProvider } from "@/context/factory-shopfloor-context";
import PicklistAssets from "@/components/factoryShopFloorForm/picklist-assets";
import Header from "@/components/factoryShopFloorForm/header";

const FactoryShopFloor = () => {
 
    return (
        <>
            <HorizontalNavbar />
            <FactoryShopFloorProvider>
                <div className="factory-shopfloor-container">
                   <Header />
                    <ShopFloorProvider>
                        <div className="factory-shopfloor-container">
                            <div className="shopfloor-list-container">
                                <ShopFloorList />
                                <div>
                                    <AllocatedAsset />
                                </div>
                            </div>
                            <div className="form-container">
                                < FactoryShopFloorForm />
                            </div>
                            <div className="allocated-list-container" >
                                <PicklistAssets />
                            </div>
                        </div>
                    </ShopFloorProvider>
                </div>
            </FactoryShopFloorProvider>
        </>
    )
}

export default FactoryShopFloor;