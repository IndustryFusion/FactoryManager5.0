import FactoryShopFloorForm from "@/components/formview-shopFloor";
import ShopFloorList from "@/components/shopfloor-list";
import UnallocatedAssets from "@/components/unallocated-assets";
import "../styles/factory-shopfloor.css"

const FactoryShopFloor = () => {

    const factoryId = "urn:ngsi-ld:factories:2:04";

    return (
        <div className="factory-shopfloor-container">
            <div>
                <ShopFloorList
                    factoryId={factoryId}
                />
            </div>
            <div className="form-container">
                < FactoryShopFloorForm />
            </div>
            <div style={{ height: "48%" }}>
                <UnallocatedAssets
                    factoryId={factoryId}
                />
            </div>
        </div>
    )
}

export default FactoryShopFloor;