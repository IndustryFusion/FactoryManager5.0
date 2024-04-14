import FactoryShopFloorForm from "@/components/formview-shopFloor";
import ShopFloorList from "@/components/shopfloor-list";
import UnallocatedAssets from "@/components/unallocated-assets";
import "../styles/factory-shopfloor.css"

const FactoryShopFloor = () => {

    const factoryId = "urn:ngsi-ld:factories:2:04";

    return (
        <>
        <div style={{height: "96vh",
    overflow: "hidden"}}>
         <div className="flex justify-content-between px-4">
                <h1>Test1</h1>
                <div> <button>Add +</button></div>
               
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