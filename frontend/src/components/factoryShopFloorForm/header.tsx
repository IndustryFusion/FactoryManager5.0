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

import { useRouter } from "next/router";
import { InputSwitch } from "primereact/inputswitch";
import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import "../../styles/factory-shopfloor.css"
import { fetchFactoryDetails, getShopFloorAssets } from "@/utility/factory-site-utility";

const Header =()=>{
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

    return(
        <>
         <div className="flex justify-content-between px-5 factory-header" style={{width:"100%"}}>
                        <h3 className="factory-heading">{factoryName}</h3>
                        <div className=" flex  gap-2 mt-4">
                            <span>Switch View</span>
                            <InputSwitch checked={switchView} onChange={(e) => {
                                setSwitchView(e.value);
                                router.push(`/factory-site/shop-floor/${factoryIdValue}`)
                            }} />
                        </div>

                    </div>
        </>
    )
}

export default Header;