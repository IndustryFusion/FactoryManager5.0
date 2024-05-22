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

import FactoryShopFloorForm from "@/components/factoryShopFloorForm/formview-shopfloor";
import ShopFloorList from "@/components/reactFlow/shopfloor-list";
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
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import ShopFloorList from "@/components/reactFlow/shopfloor-list";

const FactoryShopFloor = () => {

    const [formViewPage, setFormViewPage] = useState(true);

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
                            <div className="form-container" style={{ zoom: "90%" }}>
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

export async function getServerSideProps({ locale }: { locale: string }) {
    return {
        props: {
            ...(await serverSideTranslations(locale, [
                'header',
                'button',
                'placeholder',
                'dashboard'
            ])),
        },
    }
}

export default FactoryShopFloor;