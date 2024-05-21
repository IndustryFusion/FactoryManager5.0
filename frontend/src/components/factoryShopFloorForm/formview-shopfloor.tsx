// 
// Copyright (c) 2024 IB Systems GmbH 
// 
// Licensed under the Apache License, Version 2.0 (the "License"); 
// you may not use this file except in compliance with the License. 
// You may obtain a copy of the License at 
// 
//    http://www.apache.org/licenses/LICENSE-2.0 
// 
// Unless required by applicable law or agreed to in writing, software 
// distributed under the License is distributed on an "AS IS" BASIS, 
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. 
// See the License for the specific language governing permissions and 
// limitations under the License. 
// 

import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { InputText } from "primereact/inputtext";
import "../../styles/factory-shopfloor.css"
import { useEffect, useState } from "react";
import { fetchAssetById } from "@/utility/factory-site-utility";
import Relations from "./relations-card";
import { useFactoryShopFloor } from "@/context/factory-shopfloor-context";
import { MultiStateCheckbox } from "primereact/multistatecheckbox";
import Header from "./header";



const FactoryShopFloorForm = () => {
    const { asset, setAssetId, shopFloorValue } = useFactoryShopFloor();
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
          <Header />
            <Card className="px-3 mt-4" style={{ height: "20vh" }}>
                <div >
                    <form >
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
                          
                            <div style={{ width: "88%" }}>
                                <InputText
                                    style={{ width: "82%" }}
                                    className="input-content"
                                    placeholder=""
                                    value={assetValue || ""} // Use assetValue state here
                                    disabled={checkBoxvalue === 'lock'}
                                />
                                {/* {
                               shopFloorValue?.floorName.length > 0 &&
                                <p style={{ fontSize: "10px" }}>Select asset from shopfloor assets</p> : null
                            } */}
                             <MultiStateCheckbox
                             className="checkbox-lock"
                             style={{marginLeft:"12px",marginBottom:"0.5rem"}}
                             value={checkBoxvalue} onChange={(e) => setCheckBoxValue(e.value)} options={options} optionValue="value" />
                            </div>                                               
                        </div>
                    </form>

                </div>
            </Card>

            { Object.keys(asset).length > 0 &&  <Relations /> }
        </>
    )
}

export default FactoryShopFloorForm;