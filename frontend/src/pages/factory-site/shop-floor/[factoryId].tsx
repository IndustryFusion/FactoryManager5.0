import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "primereact/button";
import { useRouter } from "next/router";
import FlowEditor from "../factories/FlowEditor";
import ShopFloorList from "../../../components/ShopFloorList";
import UnallocatedAssets from "../../../components/UnallocatedAssets";
import { ShopFloor } from "../types/ShopFloor";
import { exportElementToJPEG } from "@/utility/FactorySiteUtility";
import { Asset } from "../../../interfaces/AssetTypes";
import HorizontalNavbar from "../../../components/HorizontalNavbar";
import Footer from "../../../components/Footer";
import Cookies from "js-cookie";
import { ShopFloorProvider } from "@/context/ShopFloorContext";

import {
  getshopFloorById,
  getNonShopFloorAsset,
  getShopFloors,
} from "@/utility/FactorySiteUtility";
import { any } from "prop-types";
import CreateShopFloor from "@/components/shopFloorForms/CreateShopFloorForm";

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
    </>
  );
};

export default ShopFloorManager;
