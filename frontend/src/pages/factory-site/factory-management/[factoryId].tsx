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

import React, { useState, useEffect, useRef, useCallback ,Suspense } from "react";
import { useRouter } from "next/router";
import dynamic from 'next/dynamic'
import { ShopFloor } from "../../../types/shop-floor";
import Navbar from "../../../components/navBar/navbar";
import Footer from "../../../components/navBar/footer";
import { ShopFloorProvider } from "@/context/shopfloor-context";
const ShopFloorList = dynamic(() => import("../../../components/reactFlow/shopfloor-list"), {
  suspense: true
});
const FlowEditor = dynamic(() => import("../../../components/reactFlow/flow-editor"), {
  suspense: true
});
const UnallocatedAssets = dynamic(() => import("../../../components/reactFlow/unallocated-allocated-assets"), {
  suspense: true
});
import {
  getShopFloors,
} from "@/utility/factory-site-utility";
import { FactoryShopFloorProvider } from "@/context/factory-shopfloor-context";
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Sidebar from "@/components/navBar/sidebar";
import "@/styles/react-flow-page.css"

const ShopFloorManager: React.FC = () => {
  const [factoryDetails, setFactoryDetails] = useState<ShopFloor | null>(null);
  const router = useRouter();
  const elementRef = useRef(null);
  const [deletedShopFloors, setDeletedShopFloors] = useState<string[]>([]);
  const [shopfloor, setShopfloor] = useState({});
  const [isSidebarExpand, setSidebarExpand] = useState(false);

  const factoryId =
    typeof router.query.factoryId === "string"
      ? router.query.factoryId
      : router.query.factoryId
      ? router.query.factoryId[0]
      : "";

  useEffect(() => {
    const fetchShopFloorById = async (factoryId: string) => {
      try {
        const details = await getShopFloors(factoryId);
        console.log("details",details)
        setFactoryDetails(details);
      } catch (error) {
        console.error("Failed to fetch factory details", error);
      }
    };

    if (router.isReady) {
      const { factoryId } = router.query;
      if (typeof factoryId === 'string') {
        const data = fetchShopFloorById(factoryId);
        console.log("data",data)
      }
    }
  }, [factoryId, router.isReady]);
  
  const handleShopFloorDeleted = useCallback((deletedShopFloorId: string) => {
    setDeletedShopFloors((prev) => [...prev, deletedShopFloorId]);
  }, []);

  return (
   <div className="flex">
      <Sidebar />
      <div className={isSidebarExpand ? "factory-container" : "factory-container-collapse"}>
        <FactoryShopFloorProvider>
          <div className="navbar_wrapper mt-4">
            <Navbar navHeader="Factory Flow" />
          </div>
          <div className="main-content bg-gray-100">
            <ShopFloorProvider>
              <div className="shopfloor-list-container">
                <ShopFloorList
                  factoryId={factoryId}
                  onShopFloorDeleted={handleShopFloorDeleted}
                  setShopfloorProp={setShopfloor}
                />
              </div>
              <div ref={elementRef} className="flow-editor-container">
                {factoryDetails ? (
                  <FlowEditor
                    factoryId={factoryId}
                    factory={factoryDetails}
                    deletedShopFloors={deletedShopFloors}
                  />
                ) : (
                  <div className="loading-state">Loading factory details...</div>
                )}
              </div>
              <div className="unallocated-assets-container">
                <UnallocatedAssets factoryId={factoryId} product_name="" />
              </div>
            </ShopFloorProvider>
          </div>
          <Footer />
        </FactoryShopFloorProvider>
      </div>
    </div>
    );
};

export async function getServerSideProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, [
        'header',
        'button',
        'placeholder',
        'reactflow',
        'dashboard',
        'placeholder',
        'overview'
      ])),
    },
  }
}

export default ShopFloorManager;
