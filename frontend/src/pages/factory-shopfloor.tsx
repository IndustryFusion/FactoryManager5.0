import FactoryShopFloorForm from "@/components/formview-shopFloor";
import ShopFloorList from "@/components/shopfloor-list";
import UnallocatedAssets from "@/components/unallocated-assets";
import "../styles/factory-shopfloor.css"
import { Button } from "primereact/button";

const FactoryShopFloor = () => {

    const factoryId = "urn:ngsi-ld:factories:2:04";

    return (
        <>
            <div style={{
                height: "96vh",
                overflow: "hidden",
                backgroundColor: "#fcfcf2"
            }}>
                <div className="flex justify-content-between px-5 factory-header">
                    <h1 className="factory-heading">Test1</h1>
                    <div className="mt-5">
                        <Button className="add-btn">Add +</Button>
                    </div>

                </div>
                <div className="factory-shopfloor-container">

                    <div className="shopfloor-list-container">
                        <ShopFloorList
                            factoryId={factoryId}
                        />
                    </div>
                    <div className="form-container">
                        < FactoryShopFloorForm />
                    </div>
                    <div
                        className="allocated-list-container"
                    >
                        <UnallocatedAssets
                            factoryId={factoryId}
                        />
                    </div>
                </div>
            </div>
        </>
    )
}

export default FactoryShopFloor;