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
  getshopFloorById,deleteShopFloorById,  fetchAllShopFloors, TransformedShopFloor } from "@/utility/factory-site-utility";
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

  const fetchShopFloorsData = async (factoryId: string) => {
    try {
      const floors = await fetchAllShopFloors(factoryId);
      setShopFloors(floors);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      setError(errorMessage);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: errorMessage,
      });
    }
  };


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
         fetchShopFloorsData(id);
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
          <div className="search-container">
            <div className="input-group">
              <div className="p-input-icon-left flex align-items-center">
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
          <div className="form-btn-container1 mb-1   ml-2 mt-1">
            <div
              className="add-area-cta"
              role="button"
              tabIndex={0}
              onClick={() => setIsVisible(true)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setIsVisible(true)}
            >
              <i className="pi pi-plus-circle add-area-cta__icon" />
              <span className="add-area-cta__text">
                {t('button:addArea', 'Add Area')}
              </span>
            </div>
          </div>
         <ul className={formViewPage ? "list-disc" : ""} style={{ marginTop: 12 }}>
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
                className={`list-item ${
                selectedShopFloorId === floor.id ||
                (!selectedShopFloorId && index === 0)
                  ? 'selected'
                  : ''
              }`}
              style={{ cursor: "pointer" }}  
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
                <span className="item-actions flex gap-2">
                  <Button
                    text
                    rounded
                    className="item-action"
                    aria-label={t('button:edit')}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedShopFloorId(floor.id);
                      setEditShopFloor(floor.id);
                      setIsEdit(true);
                    }}
                  >  <img
                  src="/factory-flow-buttons/edit-icon.svg"
                  alt=""
                  width={40}
                  height={40}
                /></Button>
                  <Button
                    text
                    rounded
                    severity="danger"
                    className="item-action"
                    aria-label={t('button:delete')}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedShopFloorId(floor.id);
                      setShowConfirmDialog(true);
                    }}
                  >  <img
                  src="/factory-flow-buttons/delete-icon.svg"
                  alt=""
                  width={40}
                  height={40}
                /></Button>
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
