import React, { useEffect, useState } from "react";
import {
  getShopFloors,
  getshopFloorById,
} from "@/utility/factory-site-utility";
import { ShopFloor } from "../../src/pages/factory-site/types/shop-floor";

interface ShopfloorListProps {
  factoryId: string;
}
const ShopFloorList: React.FC<ShopfloorListProps> = ({ factoryId }) => {
  const [shopFloors, setShopFloors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [shopFloorIds, setShopFloorIds] = useState([]);

  useEffect(() => {
    const fetchShopFloors = async () => {
      try {
        const factoryDetails = await getshopFloorById(factoryId);

        let floorsArray = [];
        if (factoryDetails.hasShopFloor) {
          const hasShopFloor = factoryDetails.hasShopFloor.object;

          floorsArray =
            typeof hasShopFloor === "string" ? [hasShopFloor] : hasShopFloor;
        }

        setShopFloors(
          floorsArray.map((floorId: any) => ({
            id: floorId,
          }))
        );
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch shop floors:", err);
        setError(err.message || "An error occurred");
        setLoading(false);
      }
    };

    fetchShopFloors();
  }, [factoryId]);

  console.log("the shop floor data", shopFloors);
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h3>Shop Floors</h3>
      <ul>
        {shopFloors.map((floor) => (
          <li
            key={floor.id}
            draggable
            onDragStart={(e) => handleDragStart(e, floor, "shopFloor")}
          >
            {floor.id}
          </li>
        ))}
      </ul>
    </div>
  );
  function handleDragStart(event: React.DragEvent, item: any, type: string) {
    const dragData = JSON.stringify({ item, type });
    event.dataTransfer.setData("application/json", dragData);
    event.dataTransfer.effectAllowed = "move";
  }
};

export default ShopFloorList;
