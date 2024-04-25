import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { InputText } from "primereact/inputtext";
import "../../styles/factory-shopfloor.css"
import { useEffect, useState } from "react";
import { fetchAssetById } from "@/utility/factory-site-utility";
import Relations from "./relations-card";
import { useFactoryShopFloor } from "@/context/factory-shopfloor-context";
import { MultiStateCheckbox } from "primereact/multistatecheckbox";

interface FactoryShopFloorProps {
    shopfloorProp: { [key: string]: any; };


}

const FactoryShopFloorForm: React.FC<FactoryShopFloorProps> = ({ shopfloorProp }) => {

    const { asset, setAssetId } = useFactoryShopFloor();
    const [checkBoxvalue, setCheckBoxValue] = useState('unlock');
    const options = [
        { value: 'unlock', icon: 'pi pi-lock-open' },
        { value: 'lock', icon: 'pi pi-lock' }
    ];
    const [assetValue, setAssetValue] = useState('');

    useEffect(() => {
        if (checkBoxvalue !== 'lock') {
            setAssetValue(asset?.product_name || '');
            setAssetId(asset?.id)
        }
    }, [asset, checkBoxvalue]);

    return (
        <>
            <Card className="px-5 " style={{ height: "25vh" }}>
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
                                value={assetValue || ""} // Use assetValue state here
                                disabled={checkBoxvalue === 'lock'}
                            />
                            {/* {
                                shopfloorProp?.floorName.length > 0 &&
                                <p style={{ fontSize: "10px" }}>Select asset from shopfloor assets</p> : null
                            } */}

                        </div>

                    </div>
                    <div className=" flex flex-column align-items-center gap-3">
                        <MultiStateCheckbox value={checkBoxvalue} onChange={(e) => setCheckBoxValue(e.value)} options={options} optionValue="value" />
                        {/* <span>{value}</span> */}
                    </div>
                </form>
            </Card>

            <div className="mt-4">
                <p style={{ fontWeight: "bold" }}>Relations</p>
                <Relations />
            </div>
        </>
    )
}

export default FactoryShopFloorForm;