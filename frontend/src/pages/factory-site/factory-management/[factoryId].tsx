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
import HorizontalNavbar from "../../../components/navBar/horizontal-navbar";
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

const ShopFloorManager: React.FC = () => {
  const [factoryDetails, setFactoryDetails] = useState<ShopFloor | null>(null);
  const router = useRouter();
  const elementRef = useRef(null);
  const [deletedShopFloors, setDeletedShopFloors] = useState<string[]>([]);
  const [shopfloor, setShopfloor] = useState({});

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
        setFactoryDetails(details);
      } catch (error) {
        console.error("Failed to fetch factory details", error);
      }
    };

    if (router.isReady) {
      const { factoryId } = router.query;
      if (typeof factoryId === 'string') {
        fetchShopFloorById(factoryId);
      }
    }
  }, [factoryId, router.isReady]);
  
  const handleShopFloorDeleted = useCallback((deletedShopFloorId: string) => {
    setDeletedShopFloors((prev) => [...prev, deletedShopFloorId]);
  }, []);

  return (
    <>
    <FactoryShopFloorProvider>
      <HorizontalNavbar />
        <div
          style={{
            display: "flex",
            height: "99vh",
            marginTop: "80px",
            zoom: "85%",
          
          }}
          className="bg-gray-100"
        >
        <ShopFloorProvider>
          <div
            style={{
              borderRight: "1px solid #ccc",
              padding: "10px",
              width: "400px",
              maxHeight: "100%",
              flexShrink: 0, // Prevents the component from shrinking
            }}
          >
            <ShopFloorList
              factoryId={factoryId}
              onShopFloorDeleted={handleShopFloorDeleted}
              setShopfloorProp={setShopfloor}
            />
          </div>
          <div
            ref={elementRef}
            style={{
              flex: 1,
              border: "1px solid #ccc",
              borderRadius: "10px",
              padding: "10px",
          
              maxHeight: "100%",
              flexShrink: 0,
            }}
          >
            {factoryDetails && (
              <FlowEditor
                factoryId={factoryId}
                factory={factoryDetails}
                deletedShopFloors={deletedShopFloors}
              />
            )}

            {!factoryDetails && <div>Loading factory details...</div>}
          </div>
           <div
            style={{
              borderRight: "1px solid #ccc",
              padding: "10px",
              width: "450px", // Ensure width is explicitly set to 350px for UnallocatedAssets as well
              maxHeight: "100%",
              flexShrink: 0, // Prevents the component from shrinking
            }}
          >
            
            <UnallocatedAssets factoryId={factoryId} product_name="" />
          </div>
        </ShopFloorProvider>
        </div>
      <Footer />
      </FactoryShopFloorProvider>
    </>
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
