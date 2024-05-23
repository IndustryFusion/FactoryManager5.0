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

import React, { useEffect, useState, useRef, ChangeEvent } from "react";
import {
  getShopFloors,
  getshopFloorById,
  deleteShopFloorById,
} from "@/utility/factory-site-utility";
import { ShopFloor } from "../../pages/factory-site/types/shop-floor";
import { Button } from "primereact/button";
import { useRouter } from "next/router";
import { Card } from "primereact/card";
import Cookies from "js-cookie";
import EditShopFloor from "../shopFloorForms/edit-shop-floor-form";
import { Toast } from "primereact/toast";
import CreateShopFloor from "../shopFloorForms/create-shop-floor-form";
import { InputText } from "primereact/inputtext";
import "../../styles/shop-floor-list.css"
import { useFactoryShopFloor } from "@/context/factory-shopfloor-context";
import { useTranslation } from "next-i18next";
import { Dialog } from 'primereact/dialog';
interface ShopfloorListProps {
  factoryId?: string | undefined;
  onShopFloorDeleted?: (shopFloorId: string) => void;
  setShopfloorProp?: any;
  formViewPage?: any
}
const ShopFloorList: React.FC<ShopfloorListProps> = ({
  factoryId,
  onShopFloorDeleted,
  setShopfloorProp,
  formViewPage
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
  const { setShopFloorValue } = useFactoryShopFloor();
  const [factoryIdValue, setFactoryIdvalue] = useState("");
  const { t } = useTranslation(['button', 'placeholder']);
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);


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
    filterShopFloors();
  }, [searchValue, shopFloors]);

  useEffect(() => {
    if (Cookies.get("login_flag") === "false") {
      router.push("/login");
    } else {
      if (router.isReady) {
        const id = Array.isArray(router.query.factoryId) ? router.query.factoryId[0] :
          router.query.factoryId;
        if (typeof id === 'string') {
          fetchShopFloors(id);
          setFactoryIdvalue(id);
        } else {
          console.error("factoryId is not a string or is undefined.");
        }
      }
    }

  }, [router.query.factoryId, router.isReady, isEdit, isVisible])

  const confirmDelete = () => {
    if (selectedShopFloorId) {
      setShowConfirmDialog(true);
    } else {
      toast.current?.show({
        severity: "warn",
        summary: "Warning",
        detail: "No shop floor selected for deletion",
      });
    }
  };

  const onConfirmDelete = async () => {
    setShowConfirmDialog(false); // Close the dialog before performing async operations
    await handleDelete(); // Wait for the delete operation to complete
  };

  const handleDelete = async () => {
    if (!selectedShopFloorId) {
      console.error("No shop floor selected for deletion");
      return;
    }
    try {
      if (factoryId) {
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
      }
      else {
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail: "Factory ID is undefined",
        });
      }
    } catch (error) {
      console.error("Error deleting shop floor:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "Failed to delete shop floor",
      });
    }
  };
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

    const dragData = JSON.stringify({ item, type });
    event.dataTransfer.setData("application/json", dragData);
    event.dataTransfer.effectAllowed = "move";
  }

  // if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  useEffect(() => {
    if (filteredShopFloors.length > 0) {
      setShopFloorValue(filteredShopFloors[0]);
    }
  }, [filteredShopFloors]);

  return (
    <>
      <Card className={formViewPage ? "" : "card-full-height"} style={{ fontSize: "15px", overflowY: "scroll" }}>
        <Dialog
          visible={showConfirmDialog}
          style={{ width: '450px' }}
          header="Confirm Deletion"
          modal
          footer={
            <>
              <Button label="No" icon="pi pi-times" onClick={() => setShowConfirmDialog(false)} className="p-button-text" />
              <Button label="Yes" icon="pi pi-check" onClick={onConfirmDelete} autoFocus />
            </>
          }
          onHide={() => setShowConfirmDialog(false)}
        >
          Are you sure you want to delete this shop floor?
        </Dialog>
        <Toast ref={toast} style={{ top: '60px' }} />
        <div>
          <h3 className="font-medium text-xl ml-5">Shop Floors</h3>
          <div className="p-input-icon-left flex align-items-center ml-4">
            <i className="pi pi-search" />
            <InputText
              value={searchValue}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setSearchValue(e.target.value)
              }
              placeholder={t('placeholder:searchByName')}
              style={{ width: "95%", marginRight: "1rem" }}
              className=""
            >
              <i className="pi pi-search" slot="prefix"></i>
            </InputText>
          </div>
          <div className="form-btn-container mb-2 flex  ml-2 mt-4">

            <Button
              label={t('button:new')}
              severity="success"
              outlined
              raised
              onClick={() => setIsVisible(true)}
              className="bold-button border-none mr-2 ml-2 p-2"
            />
            <Button
              severity="secondary"
              text
              raised
              label={t('button:edit')}
              className="bold-button mr-2 ml-2 p-2"
              type="button"
              onClick={handleEdit}
            />
            <Button
              label={t('button:delete')}
              severity="danger"
              text
              raised
              className="bold-button mr-2 ml-2 p-2"
              type="button"
              onClick={confirmDelete}
            />
          </div>
          <ul className={formViewPage ? "list-disc" : ""} style={{ marginTop: "10%" }}>
            {filteredShopFloors.map((floor, index) => (
              <li
                key={floor.id}
                draggable
                onDragStart={(e) => handleDragStart(e, floor, "shopFloor")}
                onClick={() => {
                  if (index !== 0) {
                    setSelectedShopFloorId(null);
                  }
                  setSelectedShopFloorId(floor.id);
                  setShopFloorValue(floor)
                }}
                style={{
                  cursor: "pointer",
                  backgroundColor:
                    selectedShopFloorId === floor.id
                      ? "#e3e3e3a6"
                      : index === 0 && !selectedShopFloorId
                        ? "#e3e3e3a6"
                        : "#fff",
                  position: "relative",
                  paddingLeft: "20px",
                  maxWidth: "93%"
                }}
                className="ml-3 mb-3 list-item"
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
          factoryId={factoryIdValue}
        />
      )}
    </>
  );
};

export default ShopFloorList;
