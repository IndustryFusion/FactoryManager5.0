import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { InputText } from "primereact/inputtext";
import "../../styles/factory-shopfloor.css"
import { useEffect, useState } from "react";
import { fetchAssetById } from "@/utility/factory-site-utility";
import Relations from "./relations-card";
import { useFactoryShopFloor } from "@/context/factory-shopfloor-context";
import { MultiStateCheckbox } from "primereact/multistatecheckbox";



const FactoryShopFloorForm = () => {
    const { asset, setAssetId, shopFloorValue } = useFactoryShopFloor();
    const [checkBoxvalue, setCheckBoxValue] = useState('unlock');
    const options = [
        { value: 'unlock', icon: 'pi pi-lock-open' },
        { value: 'lock', icon: 'pi pi-lock' }
    ];
    const [assetValue, setAssetValue] = useState('');

    console.log("in shopfloor asste", asset);

    useEffect(() => {
        if (checkBoxvalue !== 'lock') {
            setAssetValue(asset?.product_name || '');
            setAssetId(asset?.id)
        }
    }, [asset, checkBoxvalue]);

    return (
        <>
            <Card className="px-3 " style={{ height: "20vh" }}>
                <div className="flex">
                    <form style={{ flex: "0 0  95%" }}>
                        <div className="input-container gap-3">
                            <label htmlFor="">ShopFloor</label>
                            <div style={{ width: "80%" }}>
                                <InputText
                                    tyle={{ width: "80%" }}
                                    className="input-content"
                                    placeholder=""
                                    value={shopFloorValue?.floorName || ""}
                                />
                            </div>
                        </div>

                        <div className="input-container" style={{ gap: "3.2rem" }}>
                            <label htmlFor="">Asset</label>
                            <div style={{ width: "80%" }}>
                                <InputText
                                    style={{ width: "90%" }}
                                    className="input-content"
                                    placeholder=""
                                    value={assetValue || ""} // Use assetValue state here
                                    disabled={checkBoxvalue === 'lock'}
                                />
                                {/* {
                               shopFloorValue?.floorName.length > 0 &&
                                <p style={{ fontSize: "10px" }}>Select asset from shopfloor assets</p> : null
                            } */}

                            </div>
                        </div>
                    </form>
                    <div className=" flex flex-column align-items-center gap-3 checkbox-lock">
                        <MultiStateCheckbox value={checkBoxvalue} onChange={(e) => setCheckBoxValue(e.value)} options={options} optionValue="value" />
                    </div>
                </div>
            </Card>

            {Object.keys(asset).length > 0 &&
                <div className="mt-4">
                    <p style={{ fontWeight: "bold" }}>Relations</p>
                    <Relations />
                </div>
          }
        </>
    )
}

export default FactoryShopFloorForm;