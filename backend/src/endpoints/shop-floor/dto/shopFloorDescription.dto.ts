import { shopFloorProps } from "./shopFloorProperties.dto";
export interface shopFloorDescriptionDto  {
    type: string;
    title: string;
    description: string;
    properties: shopFloorProps[];
}