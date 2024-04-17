import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "primereact/button";
import { useRouter } from "next/router";
import FlowEditor from "../factories/flow-editor";
import ShopFloorList from "../../../components/shopfloor-list";
import UnallocatedAssets from "../../../components/unallocated-assets";
import { ShopFloor } from "../types/shop-floor";
import { exportElementToJPEG } from "@/utility/factory-site-utility";
import { Asset } from "../../../interfaces/asset-types";
import HorizontalNavbar from "../../../components/horizontal-navbar";
import Footer from "../../../components/footer";
import Cookies from "js-cookie";
import { ShopFloorProvider } from "@/context/shopfloor-context";
import { UpdateProvider  } from "@/context/react-flow-context";

import {
  getshopFloorById,
  getNonShopFloorAsset,
  getShopFloors,
} from "@/utility/factory-site-utility";
import { any } from "prop-types";
import CreateShopFloor from "@/components/shopFloorForms/create-shop-floor-form";

const ShopFloorManager: React.FC = () => {
  const [factoryDetails, setFactoryDetails] = useState<ShopFloor | null>(null);
  const router = useRouter();
  const elementRef = useRef(null);
  const [deletedShopFloors, setDeletedShopFloors] = useState<string[]>([]);

  const factoryId =
    typeof router.query.factoryId === "string"
      ? router.query.factoryId
      : router.query.factoryId
      ? router.query.factoryId[0]
      : "";

  useEffect(() => {
    const fetchShopFloorById = async (factoryId: any) => {
      try {
        const details = await getShopFloors(factoryId as any);
        setFactoryDetails(details as any);
      } catch (error) {
        console.error("Failed to fetch factory details", error);
      }
    };
    if (Cookies.get("login_flag") === "false") {
      router.push("/login");
    } else {
      if (router.isReady) {
        const { factoryId } = router.query;
        fetchShopFloorById(factoryId);
      }
    }
  }, [factoryId, router.isReady]);
  const handleShopFloorDeleted = useCallback((deletedShopFloorId: string) => {
    console.log(`Shop floor ${deletedShopFloorId} deleted`);
    setDeletedShopFloors((prev) => [...prev, deletedShopFloorId]);
  }, []);
  return (
    <>
      <UpdateProvider>
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
          {" "}
          <div
            style={{
              flex: 1,
              borderRight: "1px solid #ccc",
              padding: "10px",
              maxWidth: "18%",
              maxHeight: "100%",
            }}
          >
            <ShopFloorList
              factoryId={factoryId}
              onShopFloorDeleted={handleShopFloorDeleted}
            />
          </div>
          <div
            ref={elementRef}
            style={{
              flex: 2,
              border: "1px solid #ccc",
              borderRadius: "10px",
              padding: "10px",
              maxWidth: "73%",
              maxHeight: "98%",
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
        </ShopFloorProvider>
     
        <div
          style={{
            flex: 1,
            padding: "10px",
            maxWidth: "15%",
            maxHeight: "100%",
          }}
        >

          
          <UnallocatedAssets factoryId={factoryId} product_name="" />
        
        </div>
       
      </div>
      <Footer />
     </UpdateProvider>
    </>
  );
};

export default ShopFloorManager;
