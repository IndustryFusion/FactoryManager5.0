import React, { useEffect, useState, useRef, ChangeEvent } from "react";
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
import EditShopFloor from "./shopFloorForms/edit-shop-floor-form";

import { Toast } from "primereact/toast";
import CreateShopFloor from "./shopFloorForms/create-shop-floor-form";
import { InputText } from "primereact/inputtext";
import "../styles/shop-floor-list.css"
import { useFactoryShopFloor } from "@/context/factory-shopfloor-context";
interface ShopfloorListProps {
  factoryId: string;
  onShopFloorDeleted?: (shopFloorId: string) => void;
  setShopfloorProp?: any;
}
const ShopFloorList: React.FC<ShopfloorListProps> = ({
  factoryId,
  onShopFloorDeleted,
  setShopfloorProp
}) => {
  const [shopFloors, setShopFloors] = useState<ShopFloor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedShopFloorId, setSelectedShopFloorId] = useState<string | null>(
    null
  );
  const [isEdit, setIsEdit] = useState(false);
  const [editShopFloor, setEditShopFloor] = useState<string | undefined>("");
  const [isVisible, setIsVisible] = useState(false);
  const router = useRouter();
  const toast = useRef<Toast>(null);
  const [filteredShopFloors, setFilteredShopFloors] = useState<ShopFloor[]>([]);
  const [searchValue, setSearchValue] = useState<string>("");
 
  useEffect(() => {
    const filterShopFloors = () => {
      if (searchValue.trim()) {
        const filteredFloors = shopFloors.filter((floor) =>
          floor.floorName.toLowerCase().includes(searchValue.toLowerCase())
        );
        setFilteredShopFloors(filteredFloors);
      } else {
        setFilteredShopFloors(shopFloors);
      }
    };

    filterShopFloors();
  }, [searchValue, shopFloors]);



  const fetchShopFloors = async (factoryId: string) => {

    try {

      const factoryDetails = await getshopFloorById(factoryId);
      setShopFloors(
        factoryDetails.map((floor: ShopFloor) => ({
          id: floor.id,
          floorName:
            floor["http://www.industry-fusion.org/schema#floor_name"].value,
        }))
      );


    } catch (error) {

      if (error instanceof Error) {
        console.error("Failed to fetch shop floors:", error);
        setError(error.message);
      } else {
        console.error("Failed to fetch shop floors:", error);
        setError("An error occurred");
      }

    }

  };


  useEffect(() => {

    if (Cookies.get("login_flag") === "false") {
      router.push("/login");
    }
    else {
      if (router.isReady) {
        const factoryId = router.query.factoryId;
        if (typeof factoryId === 'string') {
          fetchShopFloors(factoryId);
        } else {
          console.error("factoryId is not a string or is undefined.");
        }
      }
    }


  }, [factoryId, isVisible, isEdit]);
  
  async function handleDelete() {
    if (!selectedShopFloorId) {
      console.log("No shop floor selected for deletion");
      toast.current?.show({
        severity: "warn",
        summary: "Warning",
        detail: "No shop floor selected for deletion",
      });
      return;
    }

    try {
      await deleteShopFloorById(
        selectedShopFloorId,
        factoryId
      );
      setShopFloors((prevShopFloors) =>
        prevShopFloors.filter((floor) => floor.id !== selectedShopFloorId)
      );

      toast.current?.show({
        severity: "success",
        summary: "Success",
        detail: "Shop floor deleted successfully",
      });
     if (onShopFloorDeleted) {
        onShopFloorDeleted(selectedShopFloorId);
      }
    } catch (error) {
      console.error("Error deleting shop floor:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "Failed to delete shop floor",
      });
    }
  }

  function handleEdit() {
    if (!selectedShopFloorId) {
      console.error("No shop floor selected for editing");
      toast.current?.show({
        severity: "warn",
        summary: "Warning",
        detail: "No shop floor selected for editing",
      });
      return;
    }

    setEditShopFloor(selectedShopFloorId);
    setIsEdit(true);
  }

  function handleDragStart(event: React.DragEvent, item: {}, type: string) {
    console.log(item, "item")
    const dragData = JSON.stringify({ item, type });
    event.dataTransfer.setData("application/json", dragData);
    event.dataTransfer.effectAllowed = "move";
  }

  // if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <>
      <Card style={{ fontSize: "15px", overflowY: "scroll", backgroundColor: "" }}>
        <Toast ref={toast} />

        <div>
          <h3
            className="font-medium text-xl ml-5"
            style={{ marginTop: "2%", marginLeft: "5%" }}
          >
            Shop Floors
          </h3>
          <div className="p-input-icon-left flex align-items-center ml-4">
            <i className="pi pi-search" />
            <InputText
              value={searchValue}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setSearchValue(e.target.value)
              }
              placeholder="Search by name..."
              style={{ width: "95%", marginRight: "1rem" }}
              className=""
            >
              <i className="pi pi-search" slot="prefix"></i>
            </InputText>
          </div>
          <div className="form-btn-container mb-2 flex  ml-2 mt-4">

            <Button
              label="New"
              severity="success"
              outlined
              raised
              onClick={() => setIsVisible(true)}
              className="bold-button border-none mr-2 ml-2"
            />
            <Button
              severity="secondary"
              text
              raised
              label="Edit"
              className="bold-button mr-2 ml-2"
              type="button"
              onClick={handleEdit}
            />
            <Button
              label="Delete"
              severity="danger"
              text
              raised
              className="bold-button mr-2 ml-2"
              type="button"
              onClick={handleDelete}
            />
          </div>
          <ul className="list-disc" style={{ marginTop: "20px" }}>
            {filteredShopFloors.map((floor) => (
              <li
                  key={floor.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, floor, "shopFloor")}
                  onClick={() =>{
                    setSelectedShopFloorId(floor.id);
                    setShopfloorProp(floor)
                  } }
                  style={{
                  cursor: "pointer",
                  backgroundColor: selectedShopFloorId === floor.id ? "lightgrey" : "transparent",
                  position: "relative",
                  paddingLeft: "20px",

                }}
                className="ml-4 mb-3"
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
