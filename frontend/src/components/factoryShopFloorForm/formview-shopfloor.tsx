import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { InputText } from "primereact/inputtext";
import "../../styles/factory-shopfloor.css"
import { useEffect } from "react";
import { fetchAssetById } from "@/utility/factory-site-utility";
import Relations from "./relations-card";

interface FactoryShopFloorProps {
    shopfloorProp: { [key: string]: any; };
    assetProp: { [key: string]: any; };
}

const FactoryShopFloorForm: React.FC<FactoryShopFloorProps> = ({ shopfloorProp, assetProp }) => {

    console.log(shopfloorProp, "shopfloorProp");
    console.log(assetProp, "assetProp");

    return (
        <Card className="px-5 " style={{ height: "90vh" }}>
            <form>
                <div className="input-container gap-6">
                    <label htmlFor="">ShopFloor</label>
                    <InputText
                        className="input-content"
                        placeholder=""
                        value={shopfloorProp?.floorName || ""}
                    />
                </div>
                <div className="input-container" style={{ gap: "5.2rem" }} >
                    <label htmlFor="">Asset</label>
                    <div style={{ width: "100%" }}>
                        <InputText
                            style={{ width: "100%" }}
                            className="input-content"
                            placeholder=""
                            value={assetProp["http://www.industry-fusion.org/schema#product_name"]?.value || ""}
                        />
                        {/* <p style={{ fontSize: "10px" }}>Select asset from shopfloor assets</p> */}
                    </div>


                </div>

                <div className="mt-4">
                    <p style={{ fontWeight: "bold" }}>Relations</p>
                    <Relations assetId={assetProp?.id} />
                </div>
              
            </form>
        </Card>
    )
}

export default FactoryShopFloorForm;