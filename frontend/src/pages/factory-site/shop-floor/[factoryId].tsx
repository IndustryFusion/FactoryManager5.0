import React, { useState, useEffect, useRef, useCallback ,Suspense } from "react";
import { Button } from "primereact/button";
import { useRouter } from "next/router";
import dynamic from 'next/dynamic'
import { ShopFloor } from "../types/shop-floor";
import { exportElementToJPEG } from "@/utility/factory-site-utility";
import { Asset } from "../../../interfaces/asset-types";
import HorizontalNavbar from "../../../components/navBar/horizontal-navbar";
import Footer from "../../../components/navBar/footer";
import Cookies from "js-cookie";
import { ShopFloorProvider } from "@/context/shopfloor-context";
const ShopFloorList = dynamic(() => import("../../../components/shopfloor-list"), {
  suspense: true
});
const FlowEditor = dynamic(() => import("../factories/flow-editor"), {
  suspense: true
});
const UnallocatedAssets = dynamic(() => import("../../../components/unallocated-assets"), {
  suspense: true
});
import {
  getshopFloorById,
  getNonShopFloorAsset,
  getShopFloors,
} from "@/utility/factory-site-utility";
import { any } from "prop-types";
import CreateShopFloor from "@/components/shopFloorForms/create-shop-floor-form";
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
        'placeholder'
      ])),
    },
  }
}

export default ShopFloorManager;
