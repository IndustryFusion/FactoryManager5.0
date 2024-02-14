import React, { useState, useEffect } from "react";
import { Button } from "primereact/button";
import { useRouter } from "next/router";
import FlowEditor from "../factories/flow-editor";
import ShopFloorList from "../../../components/ShopFloorList";
import AssetList from "../../../components/AssetList";
import { ShopFloor } from "../types/shop-floor";
import { Asset } from "../../../interfaces/assetTypes";

import {
  getshopFloorById,
  getNonShopFloorAsset,
  getShopFloors,
} from "@/utility/factory-site-utility";
import { any } from "prop-types";

const ShopFloorManager: React.FC = () => {
  const [factoryDetails, setFactoryDetails] = useState<ShopFloor | null>(null);
  const router = useRouter();

  const factoryId =
    typeof router.query.factoryId === "string"
      ? router.query.factoryId
      : router.query.factoryId
      ? router.query.factoryId[0]
      : "";

  console.log("id ", factoryId);
  useEffect(() => {
    if (factoryId) {
      (async () => {
        try {
          const details = await getshopFloorById(factoryId as any);
          setFactoryDetails(details as any);
        } catch (error) {
          console.error("Failed to fetch factory details", error);
        }
      })();
    }
  }, [factoryId]);

  console.log("G Floor setted  ", factoryDetails);

  return (
    <>
      <Button
        label="Create Floor"
        onClick={() => router.push("/create-floor")}
      />
      <div
        style={{
          display: "flex",
          height: "calc(100vh - 50px)",
          marginTop: "20px",
        }}
      >
        <div
          style={{ flex: 1, borderRight: "1px solid #ccc", padding: "10px" }}
        >
          <ShopFloorList factoryId={factoryId} />
        </div>
        <div
          style={{ flex: 2, borderRight: "1px solid #ccc", padding: "10px" }}
        >
          {factoryDetails && <FlowEditor factory={factoryDetails} />}
          {!factoryDetails && <div>Loading factory details...</div>}
        </div>
        <div style={{ flex: 1, padding: "10px" }}>
          <AssetList factoryId={factoryId} />
        </div>
      </div>
    </>
  );
};

export default ShopFloorManager;
