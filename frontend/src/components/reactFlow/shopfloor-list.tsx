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
  getshopFloorById,
  deleteShopFloorById,
} from "@/utility/factory-site-utility";
import { ShopFloor } from "../../types/shop-floor";
import { Button } from "primereact/button";
import { useRouter } from "next/router";
import { Card } from "primereact/card";
import EditShopFloor from "../shopFloorForms/edit-shop-floor-form";
import { Toast } from "primereact/toast";
import CreateShopFloor from "../shopFloorForms/create-shop-floor-form";
import { InputText } from "primereact/inputtext";
import "../../styles/shop-floor-list.css"
import { useFactoryShopFloor } from "@/context/factory-shopfloor-context";
import { useTranslation } from "next-i18next";
import { Dialog } from 'primereact/dialog';
import DeleteDialog from "../delete-dialog";
interface ShopfloorListProps {
  factoryId?: string | undefined;
  onShopFloorDeleted?: (shopFloorId: string) => void;
  setShopfloorProp?: {};
  formViewPage?:boolean
}
// Type guard to check if value is a string
const isString = (value: any): value is string => {
  return typeof value === 'string';
};

// Function to safely convert floor type to string
const normalizeFloorType = (floorType: any): string => {
  if (!floorType) return '';
  if (isString(floorType)) return floorType;
  if (typeof floorType === 'object' && floorType.value) return String(floorType.value);
  return String(floorType);
};

const getFloorTypeIcon = (floorType?: any): string => {
  const normalizedType = normalizeFloorType(floorType);
  
  if (!normalizedType) return 'pi pi-building';
  
  switch(normalizedType.toLowerCase()) {
    case 'production':
      return 'pi pi-cog';
    case 'pre-production':
    case 'pre-prodcution': // handling typo in your data
      return 'pi pi-sync';
    case 'storage and warehousing':
      return 'pi pi-box';
    case 'quality control':
      return 'pi pi-check-circle';
    case 'maintenance area':
      return 'pi pi-wrench';
    default:
      return 'pi pi-building';
  }
};

const getFloorTypeColor = (floorType?: any): string => {
  const normalizedType = normalizeFloorType(floorType);
  
  if (!normalizedType) return '#64748b';

  switch(normalizedType.toLowerCase()) {
    case 'production':
      return '#6366f1'; // indigo
    case 'pre-production':
    case 'pre-prodcution':
      return '#22c55e'; // green
    case 'storage and warehousing':
      return '#f59e0b'; // amber
    case 'quality control':
      return '#3b82f6'; // blue
    case 'maintenance area':
      return '#8b5cf6'; // purple
    default:
      return '#64748b'; // slate
  }
};

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
  const {shopFloorValue, setShopFloorValue } = useFactoryShopFloor();
  const [factoryIdValue, setFactoryIdvalue] = useState("");
  const [shopFloorName, setShopFloorName] = useState("")
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
    console.log("factoryDetails",factoryDetails)
    setShopFloors(
      factoryDetails.map((floor: any) => ({
        id: floor.id,
        floorName: floor["http://www.industry-fusion.org/schema#floor_name"]?.value || "Unnamed Floor",
        type_of_floor: floor["http://www.industry-fusion.org/schema#type_of_floor"]?.value || "Unknown"
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

console.log("shopFloor 111", shopFloors)

  useEffect(() => {
    filterShopFloors();
  }, [searchValue, shopFloors]);

  useEffect(() => {
    if (filteredShopFloors.length > 0) {
      setShopFloorValue({
          id: filteredShopFloors[0].id,
          floorName: filteredShopFloors[0].floorName,
      });
    }

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

  }, [router.query.factoryId,isVisible])

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

  const handleDeleteShopFlooor = async () => {
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



  return (
    <>
      <Card className={formViewPage ? "" : "card-full-height"} style={{ fontSize: "15px", overflowY: "scroll" }}>
        <Toast ref={toast} style={{ top: '60px' }} />
        <div>
          <h3 className="font-medium text-xl ml-5">Shop Floors</h3>
          <div className="search-container">
            <div className="input-group">
              <div className="p-input-icon-left flex align-items-center ml-4">
                <i className="pi pi-search search-icon" />
                <InputText
                  value={searchValue}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setSearchValue(e.target.value)
                  }
                  placeholder={t('placeholder:searchByName')}
                  className="search-input"
                />
              </div>
            </div>
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
          <ul className={formViewPage ? "list-disc" : ""} style={{ marginTop: "10%" , marginLeft:"-10%"}}>
          {filteredShopFloors.map((floor, index) => {
            // Get the actual floor type from the mapped data
            const floorType = floor.type_of_floor || "No Type Set";
            
            return (
              <li
                key={floor.id}
                draggable
                onDragStart={(e) => handleDragStart(e, floor, "shopFloor")}
                onClick={() => {
                  if (index !== 0) {
                    setSelectedShopFloorId(null);
                  }
                  setSelectedShopFloorId(floor.id);
                  setShopFloorValue({ id: floor.id, floorName: floor.floorName });
                }}
                className="ml-3 mb-3 list-item flex items-center gap-3 p-3 rounded-lg transition-all duration-300"
                style={{
                  cursor: "pointer",
                  backgroundColor: selectedShopFloorId === floor.id
                    ? "#e3e3e3a6"
                    : index === 0 && !selectedShopFloorId
                      ? "#e3e3e3a6"
                      : "#fff",
                  maxWidth: "93%",
                  border: "1px solid #e2e8f0",
                }}
              >
                <i 
                  className={`${getFloorTypeIcon(floorType)} floor-icon`}
                  style={{ 
                    color: getFloorTypeColor(floorType),
                    fontSize: '1.2rem'
                  }}
                />
                <span className="floor-name flex-1">
                  {floor.floorName}
                </span>
                <span 
                  className="floor-type-badge text-xs px-2 py-1 rounded-full"
                  style={{ 
                    backgroundColor: `${getFloorTypeColor(floorType)}20`,
                    color: getFloorTypeColor(floorType)
                  }}
                >
                  {floorType}
                </span>
              </li>
            );
          })}
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
      {showConfirmDialog &&
      <DeleteDialog
      deleteDialog={showConfirmDialog}
      setDeleteDialog={setShowConfirmDialog}
      handleDelete={handleDeleteShopFlooor}
      deleteItemName ={shopFloorValue?.floorName}
      />
      }
    </>
  );
};

export default ShopFloorList;
