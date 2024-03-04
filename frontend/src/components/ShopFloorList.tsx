import React, { useEffect, useState, useRef } from "react";
import {
  getShopFloors,
  getshopFloorById,
  deleteShopFloorById,
} from "@/utility/factory-site-utility";
import { ShopFloor } from "../pages/factory-site/types/shop-floor";
import { Button } from "primereact/button";
import { useRouter } from "next/router";
import { Card } from "primereact/card";
import Cookies from "js-cookie";
import EditShopFloor from "./shopFloorForms/edit-shopFloor-form";

import { Toast } from "primereact/toast";
import CreateShopFloor from "./shopFloorForms/create-shopFloor-form";

interface ShopfloorListProps {
  factoryId: string;
}
const ShopFloorList: React.FC<ShopfloorListProps> = ({ factoryId }) => {
  const [shopFloors, setShopFloors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedShopFloorId, setSelectedShopFloorId] = useState<string | null>(
    null
  );
  const [isEdit, setIsEdit] = useState(false);
  const [editShopFloor, setEditShopFloor] = useState<string | undefined>("");
  const [isVisible, setIsVisible] = useState(false);
  const router = useRouter();
  const toast = useRef<any>(null);

  useEffect(() => {
    const fetchShopFloors = async (factoryId: any) => {
      try {
        const factoryDetails = await getshopFloorById(factoryId);

        console.log(factoryDetails, "The list ");
        setShopFloors(
          factoryDetails.map((floor: any) => ({
            id: floor.id,
            floorName:
              floor["http://www.industry-fusion.org/schema#floor_name"].value,
          }))
        );
        setLoading(false);
      } catch (error: any) {
        console.error("Failed to fetch shop floors:", error);
        setError(error.message || "An error occurred");
        setLoading(false);
      }
    };
    if (Cookies.get("login_flag") === "false") {
      router.push("/login");
    } else {
      if (router.isReady) {
        const { factoryId } = router.query;
        fetchShopFloors(factoryId);
      }
    }
  }, [factoryId, router.isReady, isVisible, isEdit]);

  async function handleDelete() {
    if (!selectedShopFloorId) {
      console.error("No shop floor selected for deletion");
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No shop floor selected for deletion",
      });
      return;
    }

    try {
      const response = await deleteShopFloorById(
        selectedShopFloorId,
        factoryId
      );
      setShopFloors((prevShopFloors) =>
        prevShopFloors.filter((floor) => floor.id !== selectedShopFloorId)
      );
      toast.current.show({
        severity: "success",
        summary: "Success",
        detail: "Shop floor deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting shop floor:", error);
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "Failed to delete shop floor",
      });
    }
  }

  function handleEdit() {
    if (!selectedShopFloorId) {
      console.error("No shop floor selected for editing");
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No shop floor selected for editing",
      });
      return;
    }

    setEditShopFloor(selectedShopFloorId);
    setIsEdit(true);
  }

  function handleDragStart(event: React.DragEvent, item: any, type: string) {
    const dragData = JSON.stringify({ item, type });
    event.dataTransfer.setData("application/json", dragData);
    event.dataTransfer.effectAllowed = "move";
  }

  console.log("the shop floor data", shopFloors);
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <>
      <Card style={{ height: "99%", fontSize: "15px", overflowY: "scroll" }}>
        <Toast ref={toast} />

        <div>
          <h3
            className="font-medium text-xl"
            style={{ marginTop: "2%", marginLeft: "5%" }}
          >
            Shop Floors
          </h3>
          <div className="form-btn-container mb-2 flex justify-content-end align-items-center">
            <Button
              label="New"
              severity="success"
              outlined
              raised
              onClick={() => setIsVisible(true)}
              className="border-none  mr-2"
            />
            <Button
              severity="secondary"
              text
              raised
              label="Edit"
              className="mr-2"
              type="button"
              onClick={handleEdit}
            />
            <Button
              label="Delete"
              severity="danger"
              text
              raised
              className="mr-2"
              type="button"
              onClick={handleDelete}
            />
          </div>
          <ul className="list-disc" style={{ marginTop: "20px" }}>
            {shopFloors.map((floor) => (
              <li
                key={floor.id}
                draggable
                onDragStart={(e) => handleDragStart(e, floor, "shopFloor")}
                onClick={() => setSelectedShopFloorId(floor.id)}
                style={{
                  cursor: "pointer",
                  backgroundColor:
                    selectedShopFloorId === floor.id
                      ? "lightgrey"
                      : "transparent",
                }}
              >
                {floor.floorName}
              </li>
            ))}
          </ul>
        </div>
      </Card>
      {isEdit && (
        <EditShopFloor
          isEditProp={isEdit}
          setIsEditProp={setIsEdit}
          editShopFloorProp={editShopFloor}
        />
      )}
      {isVisible && (
        <CreateShopFloor
          isVisibleProp={isVisible}
          setIsVisibleProp={setIsVisible}
          factoryId={factoryId}
        />
      )}
    </>
  );
};

export default ShopFloorList;
